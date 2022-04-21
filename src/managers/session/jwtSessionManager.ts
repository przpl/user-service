import { singleton } from "tsyringe";
import { DataSource } from "typeorm";

import { Config } from "../../utils/config/config";
import { BaseSessionManager } from "./baseSessionManager";
import { JwtSessionCacheStrategy } from "./jwtSessionCacheStrategy";

@singleton()
export class JwtSessionManager extends BaseSessionManager {
    constructor(cacheStrategy: JwtSessionCacheStrategy, dataSource: DataSource, config: Config) {
        super(cacheStrategy, dataSource, config);
    }

    public async getUserIdFromSession(): Promise<string> {
        throw new Error("Not implemented,");
    }
}
