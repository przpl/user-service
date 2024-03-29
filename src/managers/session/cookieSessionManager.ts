import moment from "moment";
import assert from "node:assert";
import { singleton } from "tsyringe";
import { DataSource } from "typeorm";

import { CacheDb } from "../../dal/cacheDb";
import { Config } from "../../utils/config/config";
import { TimeSpan } from "../../utils/timeSpan";
import { BaseSessionManager } from "./baseSessionManager";
import { CookieSessionCacheStrategy } from "./cookieSessionCacheStrategy";

@singleton()
export class CookieSessionManager extends BaseSessionManager {
    private _cacheExpiration: TimeSpan;

    constructor(private _cacheDb: CacheDb, cacheStrategy: CookieSessionCacheStrategy, dataSource: DataSource, config: Config) {
        super(cacheStrategy, dataSource, config);
        this._cacheExpiration = TimeSpan.fromSeconds(config.session.cacheExpirationSeconds);
    }

    public async getUserIdFromSession(sessionId: string): Promise<string> {
        const userId = await this._cacheDb.getSession(sessionId);
        if (userId) {
            return userId;
        }

        return await this.tryToRecacheSession(sessionId);
    }

    public async tryToRecacheSession(sessionId: string) {
        assert(sessionId);

        const sessionInDb = await this._repo.findOneBy({ id: sessionId });
        if (sessionInDb) {
            await this._cacheDb.setSession(sessionId, sessionInDb.userId, this._cacheExpiration);
            sessionInDb.lastUseAt = moment().toDate();
            await sessionInDb.save();
            return sessionInDb.userId;
        }
        return null;
    }
}
