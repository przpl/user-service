import { Request, Response, NextFunction } from "express";

export default class InternalAuthMiddleware {
    constructor(private _masterKey: string) {
        if (!_masterKey || _masterKey.length === 0) {
            throw new Error("Master key is required.");
        }
    }

    public isInternalRequest(req: Request, res: Response, next: NextFunction) {
        const key = req.get("master-key");
        if (this._masterKey !== key) {
            return res.status(404).send();
        }
        next();
    }
}
