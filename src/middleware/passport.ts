import core from "express";
import passport from "passport";
// @ts-ignore
import GoogleTokenStrategy from "passport-google-id-token";

import { JsonConfig } from "../utils/config/jsonConfig";

type DoneFunction = (err: any, user: ExternalUser, info?: any) => void;

export interface ExternalUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface GoogleParsedToken {
    header: {
        alg: string;
        kid: string;
        typ: string;
    };
    payload: {
        at_hash: string; // eslint-disable-line camelcase
        aud: string;
        azp: string;
        email: string;
        email_verified: true; // eslint-disable-line camelcase
        exp: number;
        family_name: string; // eslint-disable-line camelcase
        given_name: string; // eslint-disable-line camelcase
        iat: number;
        iss: string;
        jti: string;
        locale: string;
        name: string;
        picture: string;
        sub: string;
    };
    signature: string;
}

export function configurePassport(app: core.Express, config: JsonConfig) {
    const externalLogin = config.externalLogin;
    if (!externalLogin.google.enabled) {
        return;
    }

    app.use(passport.initialize());

    passport.use(
        new GoogleTokenStrategy(
            {
                clientID: externalLogin.google.clientId,
                passReqToCallback: true,
            },
            async (req: Request, parsedToken: GoogleParsedToken, googleId: string, done: DoneFunction) => {
                const payload = parsedToken.payload;
                return done(null, { id: payload.sub, email: payload.email, firstName: payload.given_name, lastName: payload.family_name });
            }
        )
    );
}
