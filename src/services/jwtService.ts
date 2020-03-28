import jwt from "jsonwebtoken";
import { singleton } from "tsyringe";

import { unixTimestampS } from "../utils/timeUtils";
import { TimeSpan } from "../utils/timeSpan";
import { JWT_ID_LENGTH } from "../utils/globalConsts";
import Config from "../utils/config/config";

export interface AccessToken {
    sub: string;
    ref: string;
    rol: string[];
    iat: number;
    exp: number;
}

@singleton()
export class JwtService {
    private _jwtPrivateKey: string;
    private _tokenTTL: TimeSpan;

    constructor(config: Config) {
        this._jwtPrivateKey = config.jwtPrivateKey;
        if (!this._jwtPrivateKey) {
            throw new Error("JWT private key is required.");
        }
        this._jwtPrivateKey = this._jwtPrivateKey.trim();
        if (this._jwtPrivateKey.length < 44) {
            throw new Error("Minimum required JWT key length is 44 characters!");
        }
        this._tokenTTL = TimeSpan.fromMinutes(config.tokenTTLMinutes)
        if (this._tokenTTL.seconds <= TimeSpan.fromMinutes(1).seconds) {
            throw new Error("Token TTL has to be number greater than 1 minute.");
        }
    }

    public issueAccessToken<PayloadType>(refreshToken: string, userId: string, roles: string[], payload?: PayloadType): string {
        const now = unixTimestampS();
        const dataToSign = {
            sub: userId,
            ref: this.getTokenRef(refreshToken),
            rol: roles.length > 0 ? roles : undefined,
            iat: now,
            exp: now + this._tokenTTL.seconds,
            ...payload,
        };
        return jwt.sign(dataToSign, this._jwtPrivateKey);
    }

    public decodeAccessToken<PayloadType>(token: string): AccessToken & PayloadType {
        return jwt.verify(token, this._jwtPrivateKey) as AccessToken & PayloadType;
    }

    public getTokenRef(refreshToken: string) {
        return refreshToken.slice(0, JWT_ID_LENGTH);
    }
}
