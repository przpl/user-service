import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import passport from "passport";

import { JwtService } from "../services/jwtService";
import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";
import { InvalidJwtTypeException, ExpiredJwtException } from "../exceptions/exceptions";

export default class AuthMiddleware {
    private _googleAuthDelegate = passport.authenticate("google-id-token", { session: false });

    constructor(private _jwtService: JwtService) {
        if (!_jwtService) {
            throw new Error("JWT Service is required.");
        }
    }

    public authGoogle(req: Request, res: Response, next: NextFunction) {
        const tokenId = req.body.tokenId;
        delete req.body.tokenId;
        req.body.id_token = tokenId;
        this._googleAuthDelegate(req, res, (err: any) => {
            if (err) {
                return forwardError(next, [{ id: "externalLoginFailed" }], HttpStatus.INTERNAL_SERVER_ERROR, err);
            }
            next();
        });
    }

    public authJwt(req: Request, res: Response, next: NextFunction) {
        const bearerString = req.get("Authorization");
        if (!bearerString) {
            const errors: ErrorResponse[] = [{ id: "missingAuthorizationHeader" }];
            return forwardError(next, errors, HttpStatus.UNAUTHORIZED);
        }

        const tokenWithoutBearerPrefix = bearerString.split(" ")[1];
        try {
            req.authenticatedUser = this._jwtService.decodeAccessToken(tokenWithoutBearerPrefix);
        } catch (error) {
            const errors: ErrorResponse[] = [];
            let responseCode = HttpStatus.UNAUTHORIZED;
            if (error instanceof InvalidJwtTypeException) {
                errors.push({ id: "invalidJwtType" });
            } else if (error instanceof ExpiredJwtException) {
                errors.push({ id: "tokenExpired" });
            } else {
                responseCode = HttpStatus.INTERNAL_SERVER_ERROR;
            }
            return forwardError(next, errors, responseCode, error);
        }

        next();
    }
}
