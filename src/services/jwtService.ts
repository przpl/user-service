import jwt from "jsonwebtoken";
import { isNumber } from "util";

import { unixTimestamp } from "../utils/timeUtils";

export interface AccessToken {
    sub: string;
    iat: number;
    exp: number;
}

export class JwtService {
    private _tokenTTLSeconds: number;

    constructor(private _jwtPrivateKey: string, tokenTTLMinutes: number) {
        if (!this._jwtPrivateKey) {
            throw new Error("JWT private key is required.");
        }
        this._jwtPrivateKey = this._jwtPrivateKey.trim();
        if (this._jwtPrivateKey.length < 44) {
            throw new Error("Minimum required JWT key length is 44 characters!");
        }
        if (!isNumber(tokenTTLMinutes) || tokenTTLMinutes <= 1) {
            throw new Error("Token TTL has to be number greater than 1 minute.");
        }
        this._tokenTTLSeconds = tokenTTLMinutes * 60;
    }

    public issueAccessToken<PayloadType>(userId: string, payload?: PayloadType): string {
        const now = unixTimestamp();
        const dataToSign = {
            sub: userId,
            iat: now,
            exp: now + this._tokenTTLSeconds,
            ...payload,
        };
        return jwt.sign(dataToSign, this._jwtPrivateKey);
    }

    public decodeAccessToken<PayloadType>(token: string): AccessToken & PayloadType {
        return jwt.verify(token, this._jwtPrivateKey) as AccessToken & PayloadType;
    }
}
