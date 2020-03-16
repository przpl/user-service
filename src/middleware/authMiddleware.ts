import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import passport from "passport";

import { JwtService } from "../services/jwtService";
import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";
import { InvalidJwtTypeException, ExpiredJwtException } from "../exceptions/exceptions";

export default class AuthMiddleware {
    private _googleAuthDelegate = passport.authenticate("google-id-token", { session: false });
    private _facebookAuthDelegate = passport.authenticate("facebook-token", { session: false });

    constructor(private _jwtService: JwtService) {
        if (!_jwtService) {
            throw new Error("JWT Service is required.");
        }
    }

    public authGoogle(req: Request, res: Response, next: NextFunction) {
        const tokenId = req.body.tokenId;
        delete req.body.tokenId;
        req.body.id_token = tokenId;
        this._googleAuthDelegate(req, res, (err: any) => this.handleExternalLogin(next, err));
    }

    public authFacebook(req: Request, res: Response, next: NextFunction) {
        const accessToken = req.body.accessToken;
        delete req.body.accessToken;
        req.body.access_token = accessToken;

        this._facebookAuthDelegate(req, res, (err: any) => this.handleExternalLogin(next, err));
    }

    public authJwt(req: Request, res: Response, next: NextFunction) {
        const bearerString = req.get("Authorization");
        if (!bearerString) {
            const errors: ErrorResponse[] = [{ id: "missingAuthorizationHeader" }];
            return forwardError(next, errors, HttpStatus.UNAUTHORIZED);
        }

        const tokenWithoutBearerPrefix = bearerString.split(" ")[1];
        if (!tokenWithoutBearerPrefix) {
            return forwardError(next, [{ id: "missingAccessToken" }], HttpStatus.UNAUTHORIZED);
        }

        try {
            req.authenticatedUser = this._jwtService.decodeAccessToken(tokenWithoutBearerPrefix);
        } catch (error) {
            if (error.name === "JsonWebTokenError") {
                return forwardError(next, [{ id: "invalidJwtSignature" }], HttpStatus.UNAUTHORIZED, error);
            } else if (error.name === "TokenExpiredError") {
                return forwardError(next, [{ id: "tokenExpired" }], HttpStatus.UNAUTHORIZED, error);
            } else if (error instanceof InvalidJwtTypeException) {
                return forwardError(next, [{ id: "invalidJwtType" }], HttpStatus.UNAUTHORIZED, error);
            } else {
                return forwardError(next, [], HttpStatus.INTERNAL_SERVER_ERROR, error);
            }
        }

        next();
    }

    private handleExternalLogin(next: NextFunction, error: any) {
        if (error) {
            return forwardError(next, [{ id: "externalLoginFailed" }], HttpStatus.INTERNAL_SERVER_ERROR, error);
        }
        next();
    }
}
