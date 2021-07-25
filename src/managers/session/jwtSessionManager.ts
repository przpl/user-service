import { singleton } from "tsyringe";
import { Connection } from "typeorm";

import { Config } from "../../utils/config/config";
import { BaseSessionManager } from "./baseSessionManager";
import { JwtSessionCacheStrategy } from "./jwtSessionCacheStrategy";

@singleton()
export class JwtSessionManager extends BaseSessionManager {
    constructor(cacheStrategy: JwtSessionCacheStrategy, connection: Connection, config: Config) {
        super(cacheStrategy, connection, config);
    }

    public async getUserIdFromSession(): Promise<string> {
        throw new Error("Not implemented,");
    }
}
