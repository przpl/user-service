import { Request, Response, NextFunction } from "express";
import { UAParser } from "ua-parser-js";

export default class UserAgentMiddleware {
    public async parse(req: Request, res: Response, next: NextFunction) {
        const ua = new UAParser(req.headers["user-agent"]);
        req.userAgent = ua.getResult();
        next();
    }
}
