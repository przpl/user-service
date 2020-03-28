import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { singleton } from "tsyringe";

import { forwardError } from "../utils/expressUtils";
import Config from "../utils/config/config";

@singleton()
export default class InternalAuthMiddleware {
    private _masterKey: string;

    constructor(config: Config) {
        this._masterKey = config.masterKey;
        if (!this._masterKey || this._masterKey.length === 0) {
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
