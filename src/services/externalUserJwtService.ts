import jwt from "jsonwebtoken";
import { singleton } from "tsyringe";

import { ExternalLoginProvider } from "../dal/entities/externalLoginEntity";
import { ExternalUser } from "../middleware/passport";
import Env from "../utils/config/env";

export interface ExternalUserRegistrationJwt {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    provider: ExternalLoginProvider;
    typ: "externalUserRegistration";
    iat: number;
    exp: number;
}

@singleton()
export class ExternalUserJwtService {
    private _jwtPrivateKey: string;

    constructor(env: Env) {
        this._jwtPrivateKey = env.jwtPrivateKey;
        if (!this._jwtPrivateKey) {
            throw new Error("JWT private key is required.");
        }
        this._jwtPrivateKey = this._jwtPrivateKey.trim();
        if (this._jwtPrivateKey.length < 44) {
            throw new Error("Minimum required JWT key length is 44 characters!");
        }
    }

    public issueToken(user: ExternalUser, provider: ExternalLoginProvider): string {
        const dataToSign = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            provider: provider,
            typ: "externalUserRegistration",
        } as ExternalUserRegistrationJwt;
        return jwt.sign(dataToSign, this._jwtPrivateKey, { expiresIn: "30m" });
    }

    public decodeToken(token: string): ExternalUserRegistrationJwt {
        const data = jwt.verify(token, this._jwtPrivateKey) as ExternalUserRegistrationJwt;
        if (data.typ !== "externalUserRegistration") {
            throw new Error("Invalid token type.");
        }

        return data;
    }
}
