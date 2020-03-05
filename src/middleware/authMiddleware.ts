import { Request, Response, NextFunction } from "express";

export default class AuthMiddleware {
    constructor(private _masterKey: string) {}

    public authorizeMasterKey = (req: Request, res: Response, next: NextFunction) => {
        if (req.headers.authorization === this._masterKey) {
            next();
        } else {
            const err = { responseStatusCode: 404 };
            next(err);
        }
    };
}
