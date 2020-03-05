import { Request, Response, NextFunction } from "express";

import { forwardError } from "../utils/expressUtils";

export default class AuthMiddleware {
    constructor(private _masterKey: string) {}

    public authorizeMasterKey = (req: Request, res: Response, next: NextFunction) => {
        if (req.headers.authorization === this._masterKey) {
            next();
        } else {
            forwardError(next, [], 401);
        }
    };
}
