import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import { JwtService } from "../services/jwtService";
import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";
import { InvalidJwtTypeException, ExpiredJwtException } from "../exceptions/exceptions";

export default class AuthMiddleware {
    constructor(private _jwtService: JwtService) {
        if (!_jwtService) {
            throw new Error("JWT Service is required.");
        }
    }

    public authenticateUser(req: Request, res: Response, next: NextFunction) {
        const bearerString = req.get("Authorization");
        if (!bearerString) {
            const errors: ErrorResponse[] = [{ id: "missingAuthorizationHeader" }];
            return forwardError(next, errors, HttpStatus.UNAUTHORIZED);
        }

        const tokenWithoutBearerPrefix = bearerString.substring(7);
        try {
            req.user = this._jwtService.decodeAccessToken(tokenWithoutBearerPrefix);
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
