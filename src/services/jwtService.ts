import jwt from "jsonwebtoken";
import { singleton } from "tsyringe";

import { AccessTokenDto } from "../models/dtos/accessTokenDto";
import Env from "../utils/config/env";
import { JWT_ID_LENGTH } from "../utils/globalConsts";

@singleton()
export class JwtService {
    private _jwtPrivateKey: string;
    private _tokenTTLSeconds: number;

    constructor(env: Env) {
        this._jwtPrivateKey = env.jwtPrivateKey;
        if (!this._jwtPrivateKey) {
            throw new Error("JWT private key is required.");
        }
        this._jwtPrivateKey = this._jwtPrivateKey.trim();
        if (this._jwtPrivateKey.length < 44) {
            throw new Error("Minimum required JWT key length is 44 characters!");
        }
        this._tokenTTLSeconds = env.tokenTTLMinutes * 60;
        if (this._tokenTTLSeconds <= 60) {
            throw new Error("Token TTL has to be number greater than 1 minute.");
        }
    }

    public issueAccessToken(sessionCookie: string, userId: string, roles: string[]): string {
        const dataToSign = {
            sub: userId,
            ref: this.getSessionRef(sessionCookie),
            rol: roles.length > 0 ? roles : undefined,
        };
        return jwt.sign(dataToSign, this._jwtPrivateKey, { expiresIn: this._tokenTTLSeconds });
    }

    public decodeAccessToken(token: string): AccessTokenDto {
        const data = jwt.verify(token, this._jwtPrivateKey) as AccessTokenDto;
        if ((data as any).typ) {
            throw new Error("Invalid token type.");
        }
        return data;
    }

    public getSessionRef(sessionCookie: string) {
        return sessionCookie.slice(0, JWT_ID_LENGTH);
    }
}
