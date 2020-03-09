import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getRepository } from "typeorm";
import { isNumber } from "util";

import { UserEntity } from "../dal/entities/userEntity";
import { UserExistsException } from "../exceptions/userExceptions";
import { User } from "../interfaces/user";
import { InvalidJwtTypeException } from "../exceptions/exceptions";

const SALT_ROUNDS = 12;

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

export class UserManager {
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

    public async register(email: string, password: string): Promise<User> {
        const user = new UserEntity();
        user.email = email;
        user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        try {
            await user.save();
        } catch (error) {
            if (error.code === "23505") {
                throw new UserExistsException("E-mail duplicate.");
            }

            throw error;
        }

        return { id: user.id, email: user.email };
    }

    public async login(email: string, password: string): Promise<User> {
        const repository = getRepository(UserEntity);

        const user = await repository.findOne({
            where: {
                email: email,
            },
        });

        if (!user) {
            await bcrypt.hash(password, SALT_ROUNDS); // prevents time attack
            return null;
        }

        const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordMatch) {
            return null;
        }

        return user;
    }

    public issueRefreshToken(userId: number | string): string {
        const dataToSign: RefreshToken = {
            sub: userId,
            iat: this.unixTimestamp(),
            typ: JwtType.refresh,
        };
        return jwt.sign(dataToSign, this._jwtPrivateKey);
    }

    public issueAccessToken<PayloadType>(refreshToken: RefreshToken, payload?: PayloadType): string {
        if (refreshToken.typ !== JwtType.refresh) {
            throw new InvalidJwtTypeException("Token is not a refresh token");
        }

        const now = this.unixTimestamp();
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
        return decoded;
    }

    private unixTimestamp(): number {
        return Math.trunc(+new Date() / 1000);
    }
}
