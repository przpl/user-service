import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { singleton } from "tsyringe";

import { Xsrf } from "../services/xsrf";
import { forwardError } from "../utils/expressUtils";
import Logger from "../utils/logger";

@singleton()
export default class XsrfMiddleware {
    constructor(private _logger: Logger, private _xsrf: Xsrf) {
        if (!_xsrf) {
            throw new Error("Xsrf is required.");
        }
    }

    public validate(req: Request, res: Response, next: NextFunction) {
        if (!req.sessionId) {
            throw new Error("Missing session id. Xsrf middleware is probably used without prior authentication.");
        }

        const token = req.headers["x-xsrf-token"] as string;
        if (!token) {
            return forwardError(next, "missingXSRFToken", StatusCodes.UNAUTHORIZED);
        }

        if (!this._xsrf.validate(token, req.sessionId)) {
            this._logger.error(`Invalid XSRF token for user ${req.authenticatedUser?.sub}`);
            return forwardError(next, "invalidXSRFToken", StatusCodes.UNAUTHORIZED);
        }

        next();
    }
}
