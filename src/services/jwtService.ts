import jwt from "jsonwebtoken";
import { isNumber } from "util";

import { InvalidJwtTypeException, ExpiredJwtException } from "../exceptions/exceptions";
import { unixTimestamp } from "../utils/timeUtils";

enum JwtType {
    refresh = 0,
    access = 1,
}

export interface RefreshToken {
    sub: string | number;
    iat: number;
    typ: JwtType;
}

export interface AccessToken extends RefreshToken {
    exp: number;
}

export class JwtService {
    private _tokenTimeToLiveSeconds: number;

    constructor(private _jwtPrivateKey: string, tokenTTLMinutes: number) {
        if (!this._jwtPrivateKey) {
            throw new Error("JWT private key is required.");
        }
        this._jwtPrivateKey = this._jwtPrivateKey.trim();
        if (this._jwtPrivateKey.length < 32) {
            throw new Error("Minimum required JWT key length is 32 characters!");
        }
        if (!isNumber(tokenTTLMinutes) || tokenTTLMinutes <= 0) {
            throw new Error("Token TTL has to be number greater than 0 minutes.");
        }
        this._tokenTimeToLiveSeconds = tokenTTLMinutes * 60;
    }

    public issueRefreshToken(userId: number | string): string {
        const dataToSign: RefreshToken = {
            sub: userId,
            iat: unixTimestamp(),
            typ: JwtType.refresh,
        };
        return jwt.sign(dataToSign, this._jwtPrivateKey);
    }

    public issueAccessToken<PayloadType>(refreshToken: RefreshToken, payload?: PayloadType): string {
        if (refreshToken.typ !== JwtType.refresh) {
            throw new InvalidJwtTypeException("Token is not a refresh token");
        }

        const now = unixTimestamp();
        const dataToSign = {
            sub: refreshToken.sub,
            iat: now,
            exp: now + this._tokenTimeToLiveSeconds,
            typ: JwtType.access,
            ...payload,
        };
        return jwt.sign(dataToSign, this._jwtPrivateKey);
    }

    public decodeRefreshToken(token: string): RefreshToken {
        const decoded = jwt.verify(token, this._jwtPrivateKey) as RefreshToken;
        if (decoded.typ !== JwtType.refresh) {
            throw new InvalidJwtTypeException("Token is not a refresh token");
        }
        return decoded;
    }

    public decodeAccessToken<PayloadType>(token: string): AccessToken & PayloadType {
        const decoded = jwt.verify(token, this._jwtPrivateKey) as AccessToken & PayloadType;
        if (decoded.typ !== JwtType.access) {
            throw new InvalidJwtTypeException("Token is not an access token");
        }
        const now = unixTimestamp();
        if (decoded.exp < now) {
            throw new ExpiredJwtException();
        }
        return decoded;
    }
}
