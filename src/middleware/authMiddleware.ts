import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import passport from "passport";
import { inject, singleton } from "tsyringe";
import jwt from "jsonwebtoken";

import { sessionDoesNotExist } from "../controllers/commonErrors";
import { CacheDb } from "../dal/cacheDb";
import { BaseSessionManager } from "../managers/session/baseSessionManager";
import { AuthMode } from "../models/authMode";
import { AccessTokenDto } from "../models/dtos/accessTokenDto";
import { JwtService } from "../services/jwtService";
import { forwardError, forwardInternalError } from "../utils/expressUtils";
import { SESSION_COOKIE_NAME } from "../utils/globalConsts";
import { removeSessionCookie } from "../utils/removeSessionCookie";

@singleton()
export default class AuthMiddleware {
    private _googleAuthDelegate = passport.authenticate("google-id-token", { session: false });
    private _facebookAuthDelegate = passport.authenticate("facebook-token", { session: false });

    constructor(
        private _cacheDb: CacheDb,
        @inject(BaseSessionManager.name) private _sessionManager: BaseSessionManager,
        private _jwtService: JwtService
    ) {
        if (!_jwtService) {
            throw new Error("JWT Service is required.");
        }
    }

    public authGoogle(req: Request, res: Response, next: NextFunction) {
        const tokenId = req.body.googleTokenId;
        delete req.body.googleTokenId;
        req.body.id_token = tokenId;
        this._googleAuthDelegate(req, res, (err: any) => this.handleExternalLogin(next, err));
    }

    public authFacebook(req: Request, res: Response, next: NextFunction) {
        const accessToken = req.body.facebookAccessToken;
        delete req.body.facebookAccessToken;
        req.body.access_token = accessToken;
        this._facebookAuthDelegate(req, res, (err: any) => this.handleExternalLogin(next, err));
    }

    public jwt(req: Request, res: Response, next: NextFunction) {
        const bearerString = req.get("Authorization");
        if (!bearerString) {
            return forwardError(next, "missingAuthorizationHeader", StatusCodes.UNAUTHORIZED);
        }

        const tokenWithoutBearerPrefix = bearerString.split(" ")[1];
        if (!tokenWithoutBearerPrefix) {
            return forwardError(next, "missingAccessToken", StatusCodes.UNAUTHORIZED);
        }

        let accessToken: AccessTokenDto;
        try {
            accessToken = this._jwtService.decodeAccessToken(tokenWithoutBearerPrefix);
            req.authenticatedUser = { sub: accessToken.sub };
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                return forwardError(next, "invalidJwtSignature", StatusCodes.UNAUTHORIZED);
            } else if (error instanceof jwt.TokenExpiredError) {
                return forwardError(next, "tokenExpired", StatusCodes.UNAUTHORIZED);
            }
            return forwardInternalError(next, error);
        }

        const { sub, ref } = accessToken;
        this._cacheDb.isAccessTokenRevoked(sub, ref, (error, reply) => {
            if (error) {
                return forwardInternalError(next, error);
            }
            if (reply > 0) {
                return forwardError(next, "tokenRevoked", StatusCodes.UNAUTHORIZED);
            }
            next();
        });
    }

    public async session(req: Request, res: Response, next: NextFunction) {
        const cookie = req.cookies[SESSION_COOKIE_NAME];
        if (!cookie) {
            return forwardError(next, "missingSessionCookie", StatusCodes.UNAUTHORIZED);
        }

        const userId = await this._sessionManager.getUserIdFromSession(cookie);
        if (!userId) {
            removeSessionCookie(res);
            return sessionDoesNotExist(next);
        }

        req.authenticatedUser = { sub: userId };
        req.sessionId = cookie;

        next();
    }

    public authenticate(mode: AuthMode, req: Request, res: Response, next: NextFunction) {
        if (mode === "session") {
            this.session(req, res, next);
        } else if (mode === "jwt") {
            this.jwt(req, res, next);
        } else {
            throw new Error("Unknown authentication mode.");
        }
    }

    private handleExternalLogin(next: NextFunction, error: any) {
        if (error) {
            return forwardError(next, "externalLoginFailed", StatusCodes.INTERNAL_SERVER_ERROR, error);
        }
        next();
    }
}
