import express, { Request, Response, NextFunction, Router } from "express";
import { container } from "tsyringe";

import Validator from "../middleware/validator/validator";
import ReCaptchaMiddleware from "../middleware/reCaptchaMiddleware";
import EmailController from "../controllers/confirmationController";
import { Config } from "../utils/config/config";

export default class EmailRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(EmailController);
        const validator = container.resolve(Validator);
        const captcha = container.resolve(ReCaptchaMiddleware);
        const config = container.resolve(Config);
        const reCaptchaCfg = config.security.reCaptcha.protectedEndpoints;

        if (!config.localLogin.email.required) {
            return router;
        }

        router.post(
            "/confirm",
            validator.confirmEmail,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, reCaptchaCfg.confirmEmail),
            (req: Request, res: Response, next: NextFunction) => ctrl.confirm(req, res, next)
        );

        router.post(
            "/resend",
            validator.resendEmail,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, reCaptchaCfg.resendEmail),
            (req: Request, res: Response, next: NextFunction) => ctrl.resend(req, res, next)
        );

        return router;
    }
}
