import express, { NextFunction, Request, Response, Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "tsyringe";

import TokenController from "../controllers/tokenController";
import Validator from "../middleware/validator/validator";

export default class TokenRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(TokenController);
        const validator = container.resolve(Validator);

        router.post(
            "/refresh",
            validator.refreshToken,
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.refreshAccessToken(req, res, next))
        );

        return router;
    }
}
