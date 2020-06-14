import jwt from "jsonwebtoken";
import { singleton } from "tsyringe";
import moment from "moment";

import { TimeSpan } from "../utils/timeSpan";
import { JWT_ID_LENGTH } from "../utils/globalConsts";
import Env from "../utils/config/env";
import { AccessTokenDto } from "../models/dtos/accessTokenDto";

@singleton()
export class JwtService {
    private _jwtPrivateKey: string;
    private _tokenTTL: TimeSpan;

    constructor(env: Env) {
        this._jwtPrivateKey = env.jwtPrivateKey;
        if (!this._jwtPrivateKey) {
            throw new Error("JWT private key is required.");
        }
        this._jwtPrivateKey = this._jwtPrivateKey.trim();
        if (this._jwtPrivateKey.length < 44) {
            throw new Error("Minimum required JWT key length is 44 characters!");
        }
        this._tokenTTL = TimeSpan.fromMinutes(env.tokenTTLMinutes);
        if (this._tokenTTL.seconds <= TimeSpan.fromMinutes(1).seconds) {
            throw new Error("Token TTL has to be number greater than 1 minute.");
        }
    }

    public issueAccessToken(refreshToken: string, userId: string, roles: string[]): string {
        const now = moment().unix();
        const dataToSign = {
            sub: userId,
            ref: this.getTokenRef(refreshToken),
            rol: roles.length > 0 ? roles : undefined,
            iat: now,
            exp: now + this._tokenTTL.seconds,
        };
        return jwt.sign(dataToSign, this._jwtPrivateKey);
    }

    public decodeAccessToken(token: string): AccessTokenDto {
        return jwt.verify(token, this._jwtPrivateKey) as AccessTokenDto;
    }

    public getTokenRef(refreshToken: string) {
        return refreshToken.slice(0, JWT_ID_LENGTH);
    }
}
