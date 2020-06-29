import express, { Request, Response, NextFunction, Router } from "express";
import { container } from "tsyringe";
import asyncHandler from "express-async-handler";

import UserController from "../../controllers/user/userController";
import Validator from "../../middleware/validator/validator";
import UserAgentMiddleware from "../../middleware/userAgentMiddleware";
import { Config } from "../../utils/config/config";

export default class UserRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(UserController);
        const validator = container.resolve(Validator);
        const config = container.resolve(Config);
        const uaMiddleware = container.resolve(UserAgentMiddleware);

        router.post("/logout", validator.logout, (req: Request, res: Response, next: NextFunction) => ctrl.logout(req, res, next));

        if (config.security.mfa.enabled) {
            router.post(
                "/login/mfa",
                validator.loginWithMfa,
                (req: Request, res: Response, next: NextFunction) => uaMiddleware.parse(req, res, next),
                asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.loginWithMfa(req, res, next))
            );
        }

        return router;
    }
}
