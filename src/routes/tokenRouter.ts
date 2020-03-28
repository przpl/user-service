import express, { Request, Response, NextFunction, Router } from "express";
import { container } from "tsyringe";

import Validator from "../middleware/validator/validator";
import TokenController from "../controllers/tokenController";

export default class TokenRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(TokenController);
        const validator = container.resolve(Validator);

        router.post("/refresh", validator.refreshToken, (req: Request, res: Response, next: NextFunction) => ctrl.refreshAccessToken(req, res, next));

        return router;
    }
}
