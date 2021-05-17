import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { singleton } from "tsyringe";

import Env from "../utils/config/env";
import { forwardError } from "../utils/expressUtils";

@singleton()
export default class InternalAuthMiddleware {
    private _masterKey: string;

    constructor(env: Env) {
        this._masterKey = env.masterKey;
        if (!this._masterKey || this._masterKey.length === 0) {
            throw new Error("Master key is required.");
        }
    }

    public isInternalRequest(req: Request, res: Response, next: NextFunction) {
        const key = req.get("master-key");
        if (this._masterKey !== key) {
            return forwardError(next, "", StatusCodes.NOT_FOUND);
        }
        next();
    }
}
