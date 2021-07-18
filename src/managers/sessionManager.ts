import moment from "moment";
import { singleton } from "tsyringe";
import { getManager, getRepository } from "typeorm";

import { CacheDb } from "../dal/cacheDb";
import { SessionEntity } from "../dal/entities/sessionEntity";
import { UserEntity } from "../dal/entities/userEntity";
import { UserAgent } from "../interfaces/userAgent";
import { Session } from "../models/session";
import { generateSessionId } from "../services/generator";
import { JwtService } from "../services/jwtService";
import { Config } from "../utils/config/config";
import Env from "../utils/config/env";
import { guardNotUndefinedOrNull } from "../utils/guardClauses";
import { TimeSpan } from "../utils/timeSpan";

const ACCESS_TOKEN_EXPIRE_OFFSET = 10; // 10 seconds of additional offset to be 100% sure access token is expired

@singleton()
export class SessionManager {
    private _repo = getRepository(SessionEntity);
    private _userRepo = getRepository(UserEntity);
    private _tokenTTL: TimeSpan;
    private _cacheExpiration: TimeSpan;

    constructor(private _jwtService: JwtService, private _cacheDb: CacheDb, env: Env, private _config: Config) {
        this._tokenTTL = TimeSpan.fromMinutes(env.tokenTTLMinutes);
        this._cacheExpiration = TimeSpan.fromSeconds(_config.session.cacheExpirationSeconds);
    }

    public async getUserIdFromSession(sessionCookie: string, ip: string): Promise<string> {
        if (this._config.mode !== "session") {
            throw new Error("Only session mode is allowed.");
        }

        const userId = await this._cacheDb.getSession(sessionCookie);
        if (userId) {
            return userId;
        }
        const sessionInDb = await this._repo.findOne(sessionCookie);
        if (sessionInDb) {
            await this._cacheDb.setSession(sessionCookie, sessionInDb.userId, this._cacheExpiration);
            sessionInDb.lastRefreshIp = ip;
            sessionInDb.lastUseAt = moment().toDate();
            await sessionInDb.save();
            return sessionInDb.userId;
        }
        return null;
    }

    public async issueSession(userId: string, ip: string, userAgent: UserAgent): Promise<string> {
        const session = new SessionEntity();
        session.id = generateSessionId();
        session.userId = userId;
        session.createIp = ip;
        session.lastRefreshIp = ip;
        session.browser = userAgent.browser;
        session.os = userAgent.os;
        session.osVersion = userAgent.osVersion;
        session.lastUseAt = moment().toDate();

        const user = await this._userRepo.findOneOrFail(userId);
        let sessionsOverLimit: SessionEntity[] = null;
        let sessionIds = user.sessionIds;
        if (sessionIds.length >= this._config.session.maxPerUser) {
            const tuple = await this.getSessionsOverLimit(user);
            sessionsOverLimit = tuple.overLimit;
            sessionIds = tuple.remaining.map((i) => i.id);
            for (const session of sessionsOverLimit) {
                await this._cacheDb.removeSession(session.id);
            }
        }

        if (this._config.mode === "session") {
            for (const id of sessionIds) {
                await this._cacheDb.removeSession(id);
            }
            await this._cacheDb.setSession(session.id, userId, this._cacheExpiration);
        }

        sessionIds.push(session.id);
        user.sessionIds = sessionIds;

        await getManager().transaction(async (manager) => {
            await manager.save(session);
            await manager.save(user);
            if (sessionsOverLimit) {
                await manager.remove(sessionsOverLimit);
            }
        });

        return session.id;
    }

    public async refreshJwt(sessionCookie: string, ip: string): Promise<Session> {
        guardNotUndefinedOrNull(sessionCookie);

        const session = await this._repo.findOne(sessionCookie);
        if (!session) {
            return null;
        }

        session.lastRefreshIp = ip;
        session.lastUseAt = moment().toDate();
        await session.save();

        return this.toSessionModel(session);
    }

    public async removeAllSessions(userId: string): Promise<boolean> {
        guardNotUndefinedOrNull(userId);

        const sessions = await this._repo.find({ where: { userId } });
        if (sessions.length === 0) {
            return false;
        }

        const user = await this._userRepo.findOneOrFail(userId);
        user.sessionIds = [];

        if (this._config.mode === "session") {
            for (const session of sessions) {
                await this._cacheDb.removeSession(session.id);
            }
        } else if (this._config.mode === "jwt") {
            await this.revokeAccessTokens(sessions);
        }

        await getManager().transaction(async (manager) => {
            await manager.remove(sessions);
            await manager.save(user);
        });

        return true;
    }

    public async removeSession(cookie: string): Promise<Session> {
        guardNotUndefinedOrNull(cookie);

        const session = await this._repo.findOne(cookie);
        if (!session) {
            return null;
        }

        const user = await this._userRepo.findOneOrFail(session.userId);
        user.sessionIds = user.sessionIds.filter((i) => i !== session.id);

        if (this._config.mode === "session") {
            await this._cacheDb.removeSession(cookie);
        } else if (this._config.mode === "jwt") {
            await this.revokeAccessTokens([session]);
        }

        await getManager().transaction(async (manager) => {
            await manager.remove(session);
            await manager.save(user);
        });

        return this.toSessionModel(session);
    }

    private async revokeAccessTokens(sessions: SessionEntity[]) {
        for (const session of sessions) {
            const secondsToExpire = this.getSecondsToExpire(session);
            if (secondsToExpire > ACCESS_TOKEN_EXPIRE_OFFSET * -1) {
                const ref = this._jwtService.getSessionRef(session.id);
                const secondsToExpireWithOffset = TimeSpan.fromSeconds(secondsToExpire + ACCESS_TOKEN_EXPIRE_OFFSET);
                await this._cacheDb.revokeAccessToken(session.userId, ref, secondsToExpireWithOffset);
            }
        }
    }

    private getSecondsToExpire(session: SessionEntity): number {
        const expiresAt = moment(session.lastUseAt).add(this._tokenTTL.seconds, "seconds");
        return expiresAt.diff(moment(), "seconds");
    }

    private async getSessionsOverLimit(user: UserEntity): Promise<{ overLimit: SessionEntity[]; remaining: SessionEntity[] }> {
        const sessions = await this._repo.findByIds(user.sessionIds);
        const fromOldestToNewest = sessions.sort((a, b) => a.lastUseAt.getTime() - b.lastUseAt.getTime());
        let redundantSessionsCount = sessions.length - this._config.session.maxPerUser;
        redundantSessionsCount++; // we will create one session so we need to remove one more to make a place
        return {
            overLimit: fromOldestToNewest.slice(0, redundantSessionsCount),
            remaining: fromOldestToNewest.slice(redundantSessionsCount),
        };
    }

    private toSessionModel(entity: SessionEntity): Session {
        return new Session(entity.id, entity.userId, entity.lastUseAt, entity.createIp, entity.lastRefreshIp, entity.createdAt);
    }
}
