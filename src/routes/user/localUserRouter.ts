import express, { NextFunction, Request, Response, Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "tsyringe";

import LocalUserController from "../../controllers/user/localUserController";
import ReCaptchaMiddleware from "../../middleware/reCaptchaMiddleware";
import UserAgentMiddleware from "../../middleware/userAgentMiddleware";
import Validator from "../../middleware/validator/validator";
import { Config } from "../../utils/config/config";

export default class LocalUserRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(LocalUserController);
        const validator = container.resolve(Validator);
        const captcha = container.resolve(ReCaptchaMiddleware);
        const config = container.resolve(Config);
        const reCaptchaEnabled = config.security.reCaptcha.protectedEndpoints;
        const uaMiddleware = container.resolve(UserAgentMiddleware);

        router.post(
            "/register",
            validator.register,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, reCaptchaEnabled.register),
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.register(req, res, next))
        );

        router.post(
            "/login",
            validator.login,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, reCaptchaEnabled.login),
            (req: Request, res: Response, next: NextFunction) => uaMiddleware.parse(req, res, next),
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.login(req, res, next))
        );

        return router;
    }
}
