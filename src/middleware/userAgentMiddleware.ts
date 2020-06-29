import { Request, Response, NextFunction } from "express";
import { UAParser } from "ua-parser-js";
import { singleton } from "tsyringe";

import Logger from "../utils/logger";

@singleton()
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
