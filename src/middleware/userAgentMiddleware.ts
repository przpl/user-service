import { Request, Response, NextFunction } from "express";
import { UAParser } from "ua-parser-js";

import Logger from "../utils/logger";

export default class UserAgentMiddleware {
    constructor(private _logger: Logger) {}

    public parse(req: Request, res: Response, next: NextFunction) {
        const ua = new UAParser(req.headers["user-agent"]);
        try {
            req.userAgent = ua.getResult();
        } catch (error) {
            this._logger.error(`UserAgent: Cannot parse: ${error.message}`);
        }

        next();
    }
}
