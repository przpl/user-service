import { singleton } from "tsyringe";

import { CacheDb } from "../../dal/cacheDb";
import { SessionEntity } from "../../dal/entities/sessionEntity";
import { Config } from "../../utils/config/config";
import { TimeSpan } from "../../utils/timeSpan";
import { SessionCacheStrategy } from "./sessionCacheStrategy";

@singleton()
export class CookieSessionCacheStrategy implements SessionCacheStrategy {
    private _cacheExpiration: TimeSpan;

    constructor(private _cacheDb: CacheDb, config: Config) {
        this._cacheExpiration = TimeSpan.fromSeconds(config.session.cacheExpirationSeconds);
    }

    public async set(id: string, userId: string): Promise<void> {
        await this._cacheDb.setSession(id, userId, this._cacheExpiration);
    }

    public async remove(session: SessionEntity): Promise<void> {
        await this._cacheDb.removeSession(session.id);
    }

    public async removeMany(sessions: SessionEntity[]): Promise<void> {
        for (const session of sessions) {
            await this._cacheDb.removeSession(session.id);
        }
    }

    public async removeManyByIds(ids: string[]): Promise<void> {
        for (const id of ids) {
            await this._cacheDb.removeSession(id);
        }
    }
}
