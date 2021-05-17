import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import passport from "passport";
import { singleton } from "tsyringe";

import { CacheDb } from "../dal/cacheDb";
import { JwtService } from "../services/jwtService";
import { forwardError, forwardInternalError } from "../utils/expressUtils";

@singleton()
export default class AuthMiddleware {
    private _googleAuthDelegate = passport.authenticate("google-id-token", { session: false });
    private _facebookAuthDelegate = passport.authenticate("facebook-token", { session: false });

    constructor(private _cacheDb: CacheDb, private _jwtService: JwtService) {
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

    public authJwt(req: Request, res: Response, next: NextFunction) {
        const bearerString = req.get("Authorization");
        if (!bearerString) {
            return forwardError(next, "missingAuthorizationHeader", StatusCodes.UNAUTHORIZED);
        }

        const tokenWithoutBearerPrefix = bearerString.split(" ")[1];
        if (!tokenWithoutBearerPrefix) {
            return forwardError(next, "missingAccessToken", StatusCodes.UNAUTHORIZED);
        }

        try {
            req.authenticatedUser = this._jwtService.decodeAccessToken(tokenWithoutBearerPrefix);
        } catch (error) {
            if (error.name === "JsonWebTokenError") {
                return forwardError(next, "invalidJwtSignature", StatusCodes.UNAUTHORIZED);
            } else if (error.name === "TokenExpiredError") {
                return forwardError(next, "tokenExpired", StatusCodes.UNAUTHORIZED);
            }
            return forwardInternalError(next, error);
        }

        const { sub, ref } = req.authenticatedUser;
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

    private handleExternalLogin(next: NextFunction, error: any) {
        if (error) {
            return forwardError(next, "externalLoginFailed", StatusCodes.INTERNAL_SERVER_ERROR, error);
        }
        next();
    }
}
