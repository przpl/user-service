import { getRepository } from "typeorm";
import cryptoRandomString from "crypto-random-string";
import { singleton } from "tsyringe";
import moment from "moment";

import { SessionEntity } from "../dal/entities/sessionEntity";
import { UserEntity } from "../dal/entities/userEntity";
import { StaleRefreshTokenException } from "../exceptions/exceptions";
import nameof from "../utils/nameof";
import { TimeSpan } from "../utils/timeSpan";
import { REFRESH_TOKEN_LENGTH } from "../utils/globalConsts";
import { UserAgent } from "../interfaces/userAgent";
import { CacheDb } from "../dal/cacheDb";
import { JwtService } from "../services/jwtService";
import Env from "../utils/config/env";
import { Config } from "../utils/config/config";
import { Session } from "../models/session";

const ACCESS_TOKEN_EXPIRE_OFFSET = 20; // additional offset to be 100% sure access token is expired

@singleton()
export class SessionManager {
    private _userRepo = getRepository(UserEntity);
    private _sessionRepo = getRepository(SessionEntity);
    private _tokenTTL: TimeSpan;
    private _refreshStaleAfter: TimeSpan;

    constructor(private _jwtService: JwtService, private _cacheDb: CacheDb, env: Env, private _config: Config) {
        this._tokenTTL = TimeSpan.fromMinutes(env.tokenTTLMinutes);
        this._refreshStaleAfter = TimeSpan.fromHours(this._config.session.staleRefreshTokenAfterHours);
    }

    public async issueRefreshToken(userId: string, ip: string, userAgent: UserAgent): Promise<string> {
        await this.manageActiveSessions(userId);

        const token = cryptoRandomString({ length: REFRESH_TOKEN_LENGTH, type: "base64" });
        const entity = new SessionEntity();
        entity.token = token;
        entity.userId = userId;
        entity.createIp = ip;
        entity.lastRefreshIp = ip;
        entity.browser = userAgent.browser;
        entity.os = userAgent.os;
        entity.osVersion = userAgent.osVersion;
        entity.lastUseAt = new Date();
        await entity.save();

        return token;
    }

    public async refreshSession(refreshToken: string, ip: string): Promise<Session> {
        const entity = await this._sessionRepo.findOne({ where: { token: refreshToken } });
        if (!entity) {
            return null;
        }

        await this.assertRefreshTokenNotStale(entity);

        entity.lastRefreshIp = ip;
        entity.lastUseAt = new Date();
        await entity.save();

        return this.toSessionModel(entity);
    }

    public async revokeAllSessions(userId: string): Promise<boolean> {
        const entity = await this._sessionRepo.find({ where: { userId: userId } });
        await this.revokeAccessTokens(entity);
        await this._sessionRepo.remove(entity);
        await this._userRepo.update({ id: userId }, { activeSessions: 0 });
        return true;
    }

    public async revokeSession(refreshToken: string): Promise<boolean> {
        const entity = await this._sessionRepo.findOne({ where: { token: refreshToken } });
        if (!entity) {
            return false;
        }
        await this.revokeAccessTokens([entity]);
        await this.removeSession(entity);

        return true;
    }

    private async assertRefreshTokenNotStale(session: SessionEntity) {
        const model = this.toSessionModel(session);
        if (model.isExpired(this._refreshStaleAfter)) {
            await this.removeSession(session);
            throw new StaleRefreshTokenException();
        }
    }

    private async removeSession(session: SessionEntity) {
        await this._sessionRepo.remove(session);
        await this._userRepo.decrement({ id: session.userId }, nameof<UserEntity>("activeSessions"), 1);
    }

    private async revokeAccessTokens(sessions: SessionEntity[]) {
        for (const session of sessions) {
            const secondsToExpire = this.getSecondsToExpire(session);
            if (secondsToExpire > ACCESS_TOKEN_EXPIRE_OFFSET * -1) {
                const ref = this._jwtService.getTokenRef(session.token);
                const secondsToExpireWithOffset = TimeSpan.fromSeconds(secondsToExpire + ACCESS_TOKEN_EXPIRE_OFFSET);
                await this._cacheDb.revokeAccessToken(session.userId, ref, secondsToExpireWithOffset);
            }
        }
    }

    private getSecondsToExpire(session: SessionEntity): number {
        const expiresAt = moment(session.lastUseAt).unix() + this._tokenTTL.seconds;
        return expiresAt - moment().unix();
    }

    private async manageActiveSessions(userId: string) {
        const user = await this._userRepo.findOne({ where: { id: userId } });
        if (user.activeSessions >= this._config.session.maxPerUser) {
            const sessionsAfterRemoval = await this.removeOldestSession(userId, this._config.session.maxPerUser);
            user.activeSessions = sessionsAfterRemoval;
        }

        user.activeSessions++;
        await user.save();
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

    private toSessionModel(entity: SessionEntity): Session {
        return new Session(entity.token, entity.userId, entity.lastUseAt);
    }
}
