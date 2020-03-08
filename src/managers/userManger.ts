import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getRepository } from "typeorm";

import { UserEntity } from "../dal/entities/User";
import { UserExistsException } from "../exceptions/userExceptions";
import { User } from "../interfaces/user";

const SALT_ROUNDS = 12;
const TYPE_REFRESH = "refresh";

export interface RefreshToken {
    sub: string | number;
    iat: number;
    typ: string;
}

export interface AccessToken extends RefreshToken {
    exp: number;
}

export class UserManager {
    private _tokenTimeToLiveSeconds: number;

    constructor(private _jwtPrivateKey: string, tokenTTLMinutes: number) {
        this._tokenTimeToLiveSeconds = tokenTTLMinutes * 60;
    }

    public async register(email: string, password: string): Promise<User> {
        const user = new UserEntity();
        user.email = email;
        user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS); // TODO bcrypt has limit of 72 chars

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
            typ: TYPE_REFRESH,
        };
        return jwt.sign(dataToSign, this._jwtPrivateKey);
    }

    public issueAccessToken<PayloadType>(refreshToken: RefreshToken, payload?: PayloadType): string {
        if (refreshToken.typ !== TYPE_REFRESH) {
            throw new Error("Token is not a refresh token");
            // InvalidRefreshTokenException
        }

        const now = this.unixTimestamp();
        const dataToSign = {
            sub: refreshToken.sub,
            iat: now,
            exp: now + this._tokenTimeToLiveSeconds,
            ...payload,
        };
        return jwt.sign(dataToSign, this._jwtPrivateKey);
    }

    public decodeRefreshToken(token: string): RefreshToken {
        return jwt.verify(token, this._jwtPrivateKey) as RefreshToken;
    }

    public decodeAccessToken<PayloadType>(token: string): AccessToken & PayloadType {
        return jwt.verify(token, this._jwtPrivateKey) as AccessToken & PayloadType;
    }

    private unixTimestamp(): number {
        return Math.trunc(+new Date() / 1000);
    }
}
