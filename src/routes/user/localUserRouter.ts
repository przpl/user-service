import express, { Request, Response, NextFunction, Router } from "express";
import { container } from "tsyringe";

import LocalUserController from "../../controllers/user/localUserController";
import Validator from "../../middleware/validator/validator";
import RecaptchaMiddleware from "../../middleware/recaptchaMiddleware";
import UserAgentMiddleware from "../../middleware/userAgentMiddleware";
import { Config } from "../../utils/config/config";

export default class LocalUserRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(LocalUserController);
        const validator = container.resolve(Validator);
        const captcha = container.resolve(RecaptchaMiddleware);
        const config = container.resolve(Config);
        const recaptchaEnabled = config.security.reCaptcha.protectedEndpoints;
        const uaMiddleware = container.resolve(UserAgentMiddleware);

        router.post(
            "/register",
            validator.register,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, recaptchaEnabled.register),
            (req: Request, res: Response, next: NextFunction) => ctrl.register(req, res, next)
        );

        router.post(
            "/login",
            validator.login,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, recaptchaEnabled.login),
            (req: Request, res: Response, next: NextFunction) => uaMiddleware.parse(req, res, next),
            (req: Request, res: Response, next: NextFunction) => ctrl.login(req, res, next)
        );

        router.post("/logout", validator.logout, (req: Request, res: Response, next: NextFunction) => ctrl.logout(req, res, next));

        if (config.security.mfa.enabled) {
            router.post("/login/mfa", validator.loginWithMfa, (req: Request, res: Response, next: NextFunction) => ctrl.loginWithMfa(req, res, next));
        }

        return router;
    }
}
