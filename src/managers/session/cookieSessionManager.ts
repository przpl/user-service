import moment from "moment";
import { singleton } from "tsyringe";
import { Connection } from "typeorm";

import { CacheDb } from "../../dal/cacheDb";
import { Config } from "../../utils/config/config";
import { guardNotUndefinedOrNull } from "../../utils/guardClauses";
import { TimeSpan } from "../../utils/timeSpan";
import { BaseSessionManager } from "./baseSessionManager";
import { CookieSessionCacheStrategy } from "./cookieSessionCacheStrategy";

@singleton()
export class CookieSessionManager extends BaseSessionManager {
    private _cacheExpiration: TimeSpan;

    constructor(private _cacheDb: CacheDb, cacheStrategy: CookieSessionCacheStrategy, connection: Connection, config: Config) {
        super(cacheStrategy, connection, config);
        this._cacheExpiration = TimeSpan.fromSeconds(config.session.cacheExpirationSeconds);
    }

    public async getUserIdFromSession(sessionId: string, ip: string): Promise<string> {
        const userId = await this._cacheDb.getSession(sessionId);
        if (userId) {
            return userId;
        }

        return await this.tryToRecacheSession(sessionId, ip);
    }

    public async tryToRecacheSession(sessionId: string, ip: string) {
        guardNotUndefinedOrNull(sessionId);

        const sessionInDb = await this._repo.findOne(sessionId);
        if (sessionInDb) {
            await this._cacheDb.setSession(sessionId, sessionInDb.userId, this._cacheExpiration);
            sessionInDb.lastRefreshIp = ip;
            sessionInDb.lastUseAt = moment().toDate();
            await sessionInDb.save();
            return sessionInDb.userId;
        }
        return null;
    }
}
