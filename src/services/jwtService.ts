import jwt from "jsonwebtoken";

import { unixTimestamp } from "../utils/timeUtils";
import { TimeSpan } from "../utils/timeSpan";

export interface AccessToken {
    sub: string;
    iat: number;
    exp: number;
}

export class JwtService {
    constructor(private _jwtPrivateKey: string, private _tokenTTL: TimeSpan) {
        if (!_jwtPrivateKey) {
            throw new Error("JWT private key is required.");
        }
        this._jwtPrivateKey = this._jwtPrivateKey.trim();
        if (_jwtPrivateKey.length < 44) {
            throw new Error("Minimum required JWT key length is 44 characters!");
        }
        if (_tokenTTL.seconds <= TimeSpan.fromMinutes(1).seconds) {
            throw new Error("Token TTL has to be number greater than 1 minute.");
        }
    }

    public issueAccessToken<PayloadType>(userId: string, payload?: PayloadType): string {
        const now = unixTimestamp();
        const dataToSign = {
            sub: userId,
            iat: now,
            exp: now + this._tokenTTL.seconds,
            ...payload,
        };
        return jwt.sign(dataToSign, this._jwtPrivateKey);
    }

    public decodeAccessToken<PayloadType>(token: string): AccessToken & PayloadType {
        return jwt.verify(token, this._jwtPrivateKey) as AccessToken & PayloadType;
    }
}
