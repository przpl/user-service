import crypto from "crypto";

import { singleton } from "tsyringe";

import Env from "../utils/config/env";

@singleton()
export class Csrf {
    private _key: string;

    constructor(env: Env) {
        this._key = env.csrfKey;
        if (this._key && this._key.length < 44) {
            throw new Error("CSRF key must be at least 256-bits: 44 characters in base64.");
        }
    }

    public generate(sessionId: string): string {
        return crypto.createHmac("sha256", this._key).update(sessionId).digest("base64");
    }

    public validate(token: string, sessionId: string) {
        return token === this.generate(sessionId);
    }
}
