import express, { Request, Response, NextFunction, Router } from "express";

import Validator from "../middleware/validator/validator";
import TokenController from "../controllers/tokenController";

export default class TokenRouter {
    static getExpressRouter(controller: TokenController, validator: Validator): Router {
        const router = express.Router();

        router.post("/refresh", validator.refreshToken, (req: Request, res: Response, next: NextFunction) =>
            controller.refreshAccessToken(req, res, next)
        );

        return router;
    }
}
