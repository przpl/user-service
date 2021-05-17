import moment from "moment";
import { singleton } from "tsyringe";
import { getRepository } from "typeorm";

import { CacheDb, CachedSessions } from "../dal/cacheDb";
import { SessionEntity } from "../dal/entities/sessionEntity";
import { StaleRefreshTokenException } from "../exceptions/exceptions";
import { UserAgent } from "../interfaces/userAgent";
import { isExpired } from "../models/expirable";
import { Session } from "../models/session";
import { generateRefreshToken } from "../services/generator";
import { JwtService } from "../services/jwtService";
import { Config } from "../utils/config/config";
import Env from "../utils/config/env";
import { guardNotUndefinedOrNull } from "../utils/guardClauses";
import { TimeSpan } from "../utils/timeSpan";

const ACCESS_TOKEN_EXPIRE_OFFSET = 20; // additional offset to be 100% sure access token is expired

@singleton()
export class SessionManager {
    private _repo = getRepository(SessionEntity);
    private _tokenTTL: TimeSpan;
    private _refreshStaleAfter: TimeSpan;

    constructor(private _jwtService: JwtService, private _cacheDb: CacheDb, env: Env, private _config: Config) {
        this._tokenTTL = TimeSpan.fromMinutes(env.tokenTTLMinutes);
        this._refreshStaleAfter = TimeSpan.fromHours(this._config.session.staleRefreshTokenAfterHours);
    }

    public async issueRefreshToken(userId: string, ip: string, userAgent: UserAgent): Promise<string> {
        const { outOfLimit, active } = await this.filterOutOfLimitAndGetActive(userId);

        const now = moment();
        const entity = new SessionEntity();
        entity.token = generateRefreshToken();
        entity.userId = userId;
        entity.createIp = ip;
        entity.lastRefreshIp = ip;
        entity.browser = userAgent.browser;
        entity.os = userAgent.os;
        entity.osVersion = userAgent.osVersion;
        entity.lastUseAt = now.toDate();
        await entity.save();

        if (outOfLimit.length > 0) {
            await this._repo.delete(outOfLimit.map((i) => i.id));
        }

        active.push({ id: entity.token, ts: now.unix() });
        await this._cacheDb.setCachedSessions(userId, active);

        return entity.token;
    }

    public async refreshSession(refreshToken: string, ip: string): Promise<Session> {
        guardNotUndefinedOrNull(refreshToken);

        const entity = await this._repo.findOne(refreshToken);
        if (!entity) {
            return null;
        }

        const cached = await this._cacheDb.getCachedSessions(entity.userId);

        if (this.toSessionModel(entity).isExpired(this._refreshStaleAfter)) {
            const token = entity.token;
            await this._repo.remove(entity);
            await this.deleteCached(entity.userId, cached, token);

            throw new StaleRefreshTokenException();
        }

        const now = moment();
        entity.lastRefreshIp = ip;
        entity.lastUseAt = now.toDate();
        await entity.save();

        const toUpdate = cached.find((i) => i.id === entity.token);
        if (toUpdate) {
            toUpdate.ts = now.unix();
        } else {
            cached.push({ id: entity.token, ts: now.unix() });
        }
        await this._cacheDb.setCachedSessions(entity.userId, cached);

        return this.toSessionModel(entity);
    }

    public async revokeAllSessions(userId: string): Promise<boolean> {
        guardNotUndefinedOrNull(userId);

        const entities = await this._repo.find({ where: { userId: userId } });
        if (entities.length === 0) {
            return false;
        }
        await this.revokeAccessTokens(entities);
        await this._repo.remove(entities);
        await this._cacheDb.deleteCachedSessions(userId);

        return true;
    }

    public async revokeSession(refreshToken: string): Promise<Session> {
        guardNotUndefinedOrNull(refreshToken);

        const entity = await this._repo.findOne(refreshToken);
        if (!entity) {
            return null;
        }

        await this.revokeAccessTokens([entity]);
        const token = entity.token;
        await this._repo.remove(entity);
        const cached = await this._cacheDb.getCachedSessions(entity.userId);
        await this.deleteCached(entity.userId, cached, token);

        return this.toSessionModel(entity);
    }

    private async deleteCached(userId: string, cached: CachedSessions[], id: string) {
        const remaining = cached.filter((i) => i.id !== id);
        if (remaining.length === 0) {
            await this._cacheDb.deleteCachedSessions(userId);
        } else {
            await this._cacheDb.setCachedSessions(userId, remaining);
        }
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
        const expiresAt = moment(session.lastUseAt).add(this._tokenTTL.seconds, "seconds");
        return expiresAt.diff(moment(), "seconds");
    }

    private async filterOutOfLimitAndGetActive(userId: string): Promise<{ outOfLimit: CachedSessions[]; active: CachedSessions[] }> {
        let outOfLimit: CachedSessions[] = [];
        let active = await this._cacheDb.getCachedSessions(userId);
        if (active.length >= this._config.session.maxPerUser) {
            outOfLimit = this.getOutOfLimit(active);
            active = active.filter((i) => outOfLimit.findIndex((j) => i.id === j.id) === -1);
        }
        return { outOfLimit, active };
    }

    private getOutOfLimit(sessions: CachedSessions[]): CachedSessions[] {
        const now = moment();
        const expired = sessions.filter((i) => isExpired(moment.unix(i.ts), this._refreshStaleAfter, now));
        if (expired.length > 0) {
            return expired;
        }

        const fromOldestToNewest = sessions.sort((a, b) => a.ts - b.ts);
        let redundantSessionsCount = sessions.length - this._config.session.maxPerUser;
        redundantSessionsCount++; // we will create one session so we need to remove one more to make a place
        return fromOldestToNewest.slice(0, redundantSessionsCount);
    }

    private toSessionModel(entity: SessionEntity): Session {
        return new Session(entity.token, entity.userId, entity.lastUseAt, entity.createIp, entity.lastRefreshIp, entity.createdAt);
    }
}
