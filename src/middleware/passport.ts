import core, { Request } from "express";
import passport from "passport";
import FacebookTokenStrategy from "passport-facebook-token";
// @ts-ignore
import GoogleTokenStrategy from "passport-google-id-token";

import { Config } from "../utils/config/config";

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

export function configurePassport(app: core.Express, config: Config) {
    if (!isAnyExternalLoginEnabled(config)) {
        return;
    }

    const externalLogin = config.externalLogin;

    app.use(passport.initialize());

    if (externalLogin.google.enabled) {
        passport.use(googleStrategy(config));
    }
    if (externalLogin.facebook.enabled) {
        passport.use(facebookStrategy(config));
    }
}

function googleStrategy(config: Config) {
    return new GoogleTokenStrategy(
        {
            clientID: config.externalLogin.google.clientId,
            passReqToCallback: true,
        },
        async (req: Request, parsedToken: GoogleParsedToken, googleId: string, done: DoneFunction) => {
            const payload = parsedToken.payload;
            return done(null, { id: payload.sub, email: payload.email, firstName: payload.given_name, lastName: payload.family_name });
        }
    );
}

function facebookStrategy(config: Config) {
    return new FacebookTokenStrategy(
        {
            clientID: config.externalLogin.facebook.clientId,
            clientSecret: config.externalLogin.facebook.clientSecret,
            passReqToCallback: true,
        },
        async (req, accessToken, refreshToken, profile, done) => {
            return done(null, {
                id: profile.id,
                email: profile?.emails[0].value,
                firstName: profile?.name.givenName,
                lastName: profile?.name.familyName,
            });
        }
    );
}

function isAnyExternalLoginEnabled(config: Config): boolean {
    const cfg = config.externalLogin;
    for (const key in cfg) {
        if ((cfg as any)[key].enabled) {
            return true;
        }
    }
    return false;
}
