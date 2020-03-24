import { getRepository } from "typeorm";

import { SessionEntity } from "../dal/entities/sessionEntity";
import { CryptoService } from "../services/cryptoService";
import { UserEntity } from "../dal/entities/userEntity";
import { JsonConfig } from "../utils/config/jsonConfig";
import { isExpired, toUnixTimestampS, unixTimestampS } from "../utils/timeUtils";
import { StaleRefreshTokenException } from "../exceptions/exceptions";
import nameof from "../utils/nameof";
import { TimeSpan } from "../utils/timeSpan";
import { REFRESH_TOKEN_BYTES } from "../utils/globalConsts";
import { UserAgent } from "../interfaces/userAgent";
import { CacheDb } from "../dal/cacheDb";
import { JwtService } from "../services/jwtService";

export class SessionManager {
    private _userRepo = getRepository(UserEntity);
    private _sessionRepo = getRepository(SessionEntity);

    constructor(
        private _cryptoService: CryptoService,
        private _jwtService: JwtService,
        private _cacheDb: CacheDb,
        private _jsonConfig: JsonConfig,
        private _tokenTTL: TimeSpan
    ) {}

    public async issueRefreshToken(userId: string, ip: string, userAgent: UserAgent): Promise<string> {
        const user = await this._userRepo.findOne({ where: { id: userId } });
        if (user.activeSessions >= this._jsonConfig.session.maxPerUser) {
            const sessionsAfterRemoval = await this.removeOldestSession(userId, this._jsonConfig.session.maxPerUser);
            user.activeSessions = sessionsAfterRemoval;
        }

        user.activeSessions++;
        await user.save();

        const token = this._cryptoService.randomBytesInBase64(REFRESH_TOKEN_BYTES);
        const session = new SessionEntity();
        session.token = token;
        session.userId = userId;
        session.createIp = ip;
        session.lastRefreshIp = ip;
        session.browser = userAgent.browser;
        session.os = userAgent.os;
        session.osVersion = userAgent.osVersion;
        session.lastUseAt = new Date();
        await session.save();

        return token;
    }

    public async refreshSessionAndGetUserId(refreshToken: string, ip: string): Promise<string> {
        const session = await this._sessionRepo.findOne({ where: { token: refreshToken } });
        if (!session) {
            return null;
        }

        if (isExpired(session.lastUseAt, TimeSpan.fromHours(this._jsonConfig.session.staleRefreshTokenAfterHours))) {
            await this._sessionRepo.remove(session);
            await this._userRepo.decrement({ id: session.userId }, nameof<UserEntity>("activeSessions"), 1);
            throw new StaleRefreshTokenException();
        }

        session.lastRefreshIp = ip;
        session.lastUseAt = new Date();
        await session.save();
        return session.userId;
    }

    public async revokeSession(refreshToken: string): Promise<boolean> {
        const session = await this._sessionRepo.findOne({ where: { token: refreshToken } });
        if (!session) {
            return false;
        }
        await this._sessionRepo.remove(session);
        const expireOffsetS = 60; // additional offset to be 100% sure access token is expired
        const ref = this._jwtService.getTokenRef(refreshToken);
        const accessExpiresAtS = toUnixTimestampS(session.lastUseAt) + this._tokenTTL.seconds; // TODO seperate method for calculating this
        const timeRmainingToExpireS = accessExpiresAtS - unixTimestampS();
        if (timeRmainingToExpireS > expireOffsetS * -1) {
            await this._cacheDb.revokeAccessToken(session.userId, ref, TimeSpan.fromSeconds(timeRmainingToExpireS));
        }
        return true;
    }

    private async removeOldestSession(userId: string, maxSessionsPerUser: number): Promise<number> {
        const sessions = await this._sessionRepo.find({ where: { userId: userId } });
        if (sessions.length < maxSessionsPerUser) {
            return;
        }
        const fromOldestToNewest = sessions.sort((a, b) => a.lastUseAt.getTime() - b.lastUseAt.getTime());
        let redundantSessionsCount = sessions.length - maxSessionsPerUser;
        redundantSessionsCount++; // we will create one sesion so we need to remove one more to make a place
        const sessionsToRemove = fromOldestToNewest.slice(0, redundantSessionsCount);
        await this._sessionRepo.remove(sessionsToRemove);

        return sessions.length - redundantSessionsCount;
    }
}
