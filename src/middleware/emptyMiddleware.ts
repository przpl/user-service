import { NextFunction, Request, Response } from "express";

export function emptyMiddleware(req: Request, res: Response, next: NextFunction) {
    next();
}
