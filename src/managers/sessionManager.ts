import { getRepository } from "typeorm";
import cryptoRandomString from "crypto-random-string";
import { singleton } from "tsyringe";

import { SessionEntity } from "../dal/entities/sessionEntity";
import { UserEntity } from "../dal/entities/userEntity";
import { isExpired, toUnixTimestampS, unixTimestampS } from "../utils/timeUtils";
import { StaleRefreshTokenException } from "../exceptions/exceptions";
import nameof from "../utils/nameof";
import { TimeSpan } from "../utils/timeSpan";
import { REFRESH_TOKEN_LENGTH } from "../utils/globalConsts";
import { UserAgent } from "../interfaces/userAgent";
import { CacheDb } from "../dal/cacheDb";
import { JwtService } from "../services/jwtService";
import Env from "../utils/config/env";
import { Config } from "../utils/config/config";

@singleton()
export class SessionManager {
    private _userRepo = getRepository(UserEntity);
    private _sessionRepo = getRepository(SessionEntity);
    private _tokenTTL: TimeSpan;

    constructor(private _jwtService: JwtService, private _cacheDb: CacheDb, env: Env, private config: Config) {
        this._tokenTTL = TimeSpan.fromMinutes(env.tokenTTLMinutes);
    }

    public async issueRefreshToken(userId: string, ip: string, userAgent: UserAgent): Promise<string> {
        const user = await this._userRepo.findOne({ where: { id: userId } });
        if (user.activeSessions >= this.config.session.maxPerUser) {
            const sessionsAfterRemoval = await this.removeOldestSession(userId, this.config.session.maxPerUser);
            user.activeSessions = sessionsAfterRemoval;
        }

        user.activeSessions++;
        await user.save();

        const token = cryptoRandomString({ length: REFRESH_TOKEN_LENGTH, type: "base64" });
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

        if (isExpired(session.lastUseAt, TimeSpan.fromHours(this.config.session.staleRefreshTokenAfterHours))) {
            await this._sessionRepo.remove(session);
            await this._userRepo.decrement({ id: session.userId }, nameof<UserEntity>("activeSessions"), 1);
            throw new StaleRefreshTokenException();
        }

        session.lastRefreshIp = ip;
        session.lastUseAt = new Date();
        await session.save();
        return session.userId;
    }

    public async revokeAllSessions(userId: string): Promise<boolean> {
        const sessions = await this._sessionRepo.find({ where: { userId: userId } });
        await this.revokeAccessTokens(sessions);
        await this._sessionRepo.remove(sessions);
        await this._userRepo.update({ id: userId }, { activeSessions: 0 });
        return true;
    }

    public async revokeSession(refreshToken: string): Promise<boolean> {
        const session = await this._sessionRepo.findOne({ where: { token: refreshToken } });
        if (!session) {
            return false;
        }
        await this.revokeAccessTokens([session]);
        await this._sessionRepo.remove(session);
        await this._userRepo.decrement({ id: session.userId }, nameof<UserEntity>("activeSessions"), 1);
        return true;
    }

    private async revokeAccessTokens(sessions: SessionEntity[]) {
        for (const session of sessions) {
            const expireOffsetS = 20; // additional offset to be 100% sure access token is expired
            const ref = this._jwtService.getTokenRef(session.token);
            const accessExpiresAtS = toUnixTimestampS(session.lastUseAt) + this._tokenTTL.seconds; // TODO seperate method for calculating this
            const timeRmainingToExpireS = accessExpiresAtS - unixTimestampS();
            if (timeRmainingToExpireS > expireOffsetS * -1) {
                await this._cacheDb.revokeAccessToken(session.userId, ref, TimeSpan.fromSeconds(timeRmainingToExpireS + expireOffsetS));
            }
        }
    }

    private async removeOldestSession(userId: string, maxSessionsPerUser: number): Promise<number> {
        const sessions = await this._sessionRepo.find({ where: { userId: userId } });
        if (sessions.length < maxSessionsPerUser) {
            return sessions.length;
        }
        const fromOldestToNewest = sessions.sort((a, b) => a.lastUseAt.getTime() - b.lastUseAt.getTime());
        let redundantSessionsCount = sessions.length - maxSessionsPerUser;
        redundantSessionsCount++; // we will create one sesion so we need to remove one more to make a place
        const sessionsToRemove = fromOldestToNewest.slice(0, redundantSessionsCount);
        await this._sessionRepo.remove(sessionsToRemove);

        return sessions.length - redundantSessionsCount;
    }
}
