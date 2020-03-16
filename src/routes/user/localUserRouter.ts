import express, { Request, Response, NextFunction, Router } from "express";

import LocalUserController from "../../controllers/user/localUserController";
import Validator from "../../middleware/validator";
import RecaptchaMiddleware from "../../middleware/recaptchaMiddleware";
import { JsonConfig } from "../../utils/config/jsonConfig";

export default class LocalUserRouter {
    static getExpressRouter(controller: LocalUserController, validator: Validator, captcha: RecaptchaMiddleware, jsonConfig: JsonConfig): Router {
        const router = express.Router();
        const recaptchaEnabled = jsonConfig.security.reCaptcha.protectedEndpoints;

        router.post(
            "/register",
            validator.register,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, recaptchaEnabled.register),
            (req: Request, res: Response, next: NextFunction) => controller.register(req, res, next)
        );

        router.post(
            "/login",
            validator.login,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, recaptchaEnabled.login),
            (req: Request, res: Response, next: NextFunction) => controller.login(req, res, next)
        );

        if (jsonConfig.security.twoFaToken.enabled) {
            router.post("/login/mfa", validator.loginWithTwoFa, (req: Request, res: Response, next: NextFunction) =>
                controller.loginWithTwoFa(req, res, next)
            );
        }

        return router;
    }
}
