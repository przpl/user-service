import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import { forwardError } from "../utils/expressUtils";

export default class InternalAuthMiddleware {
    constructor(private _masterKey: string) {
        if (!_masterKey || _masterKey.length === 0) {
            throw new Error("Master key is required.");
        }
    }

    public isInternalRequest(req: Request, res: Response, next: NextFunction) {
        const key = req.get("master-key");
        if (this._masterKey !== key) {
            return forwardError(next, [], HttpStatus.NOT_FOUND);
        }
        next();
    }
}
