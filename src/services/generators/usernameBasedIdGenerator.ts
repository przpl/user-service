import * as blake3 from "blake3";
import { singleton } from "tsyringe";

import { Config } from "../../utils/config/config";
import { USER_ID_LENGTH } from "../../utils/globalConsts";
import { UserIdGenerator } from "./userIdGenerator";

@singleton()
export class UsernameBasedIdGenerator implements UserIdGenerator {
    private _key: string;

    constructor(config: Config) {
        this._key = config.localLogin.username.hashKey;
    }

    public generate(username: string): string {
        const hash = blake3.hash(this._key + username) as Buffer;
        return Buffer.from(hash).toString("base64").substring(0, USER_ID_LENGTH);
    }
}
