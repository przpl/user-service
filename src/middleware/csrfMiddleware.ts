import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { singleton } from "tsyringe";

import { Csrf } from "../services/csrf";
import { forwardError } from "../utils/expressUtils";
import Logger from "../utils/logger";

@singleton()
export default class CsrfMiddleware {
    constructor(private _logger: Logger, private _csrf: Csrf) {
        if (!_csrf) {
            throw new Error("Csrf is required.");
        }
    }

    public validate(req: Request, res: Response, next: NextFunction) {
        if (!req.sessionId) {
            throw new Error("Missing session id. Csrf middleware is probably used without prior authentication.");
        }

        const token = req.headers["x-xsrf-token"] as string;
        if (!token) {
            return forwardError(next, "missingCSRFToken", StatusCodes.UNAUTHORIZED);
        }

        if (!this._csrf.validate(token, req.sessionId)) {
            this._logger.error(`Invalid CSRF token for user ${req.authenticatedUser?.sub}`);
            return forwardError(next, "invalidCSRFToken", StatusCodes.UNAUTHORIZED);
        }

        next();
    }
}
