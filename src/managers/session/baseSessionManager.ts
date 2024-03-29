import moment from "moment";
import assert from "node:assert";
import { DataSource } from "typeorm";

import { SessionEntity } from "../../dal/entities/sessionEntity";
import { UserEntity } from "../../dal/entities/userEntity";
import { UserAgent } from "../../interfaces/userAgent";
import { Session } from "../../models/session";
import { generateSessionId } from "../../services/generator";
import { Config } from "../../utils/config/config";
import { SessionCacheStrategy } from "./sessionCacheStrategy";

export abstract class BaseSessionManager {
    protected _repo = this._dataSource.getRepository(SessionEntity);
    protected _userRepo = this._dataSource.getRepository(UserEntity);

    constructor(private _cacheStrategy: SessionCacheStrategy, private _dataSource: DataSource, private _config: Config) {}

    public abstract getUserIdFromSession(sessionId: string): Promise<string>;

    public async issueSession(userId: string, ip: string, userAgent: UserAgent): Promise<string> {
        assert(userId);
        const session = new SessionEntity();
        session.id = generateSessionId();
        session.userId = userId;
        session.createIp = ip;
        session.browser = userAgent.browser;
        session.os = userAgent.os;
        session.osVersion = userAgent.osVersion;
        session.lastUseAt = moment().toDate();

        const user = await this._userRepo.findOneByOrFail({ id: userId });
        let sessionsOverLimit: SessionEntity[] = null;
        let sessionIds = user.sessionIds;
        if (sessionIds.length >= this._config.session.maxPerUser) {
            const tuple = await this.getSessionsOverLimit(user);
            sessionsOverLimit = tuple.overLimit;
            sessionIds = tuple.remaining.map((i) => i.id);
            await this._cacheStrategy.removeMany(sessionsOverLimit);
        }

        await this._cacheStrategy.removeManyByIds(sessionIds); // make sure only one session per user at particular time is cached
        await this._cacheStrategy.set(session.id, userId);

        sessionIds.push(session.id);
        user.sessionIds = sessionIds;

        await this._dataSource.manager.transaction(async (manager) => {
            await manager.save(session);
            await manager.save(user);
            if (sessionsOverLimit) {
                await manager.remove(sessionsOverLimit);
            }
        });

        return session.id;
    }

    public async refreshJwt(sessionId: string): Promise<Session> {
        assert(sessionId);

        const session = await this._repo.findOneBy({ id: sessionId });
        if (!session) {
            return null;
        }

        session.lastUseAt = moment().toDate();
        await session.save();

        return this.toSessionModel(session);
    }

    public async removeAllSessions(userId: string): Promise<boolean> {
        assert(userId);

        const sessions = await this._repo.findBy({ userId });
        if (sessions.length === 0) {
            return false;
        }

        const user = await this._userRepo.findOneByOrFail({ id: userId });
        user.sessionIds = [];

        await this._cacheStrategy.removeMany(sessions);

        await this._dataSource.manager.transaction(async (manager) => {
            await manager.remove(sessions);
            await manager.save(user);
        });

        return true;
    }

    public async removeSession(sessionId: string): Promise<Session> {
        assert(sessionId);

        const session = await this._repo.findOneBy({ id: sessionId });
        if (!session) {
            return null;
        }

        const user = await this._userRepo.findOneByOrFail({ id: session.userId });
        user.sessionIds = user.sessionIds.filter((i) => i !== session.id);

        await this._cacheStrategy.remove(session);

        await this._dataSource.manager.transaction(async (manager) => {
            await manager.remove(session);
            await manager.save(user);
        });

        session.id = sessionId;

        return this.toSessionModel(session);
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
        return new Session(entity.id, entity.userId, entity.lastUseAt, entity.createIp, entity.createdAt);
    }
}
