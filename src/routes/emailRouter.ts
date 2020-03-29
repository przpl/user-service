import express, { Request, Response, NextFunction, Router } from "express";
import { container } from "tsyringe";

import Validator from "../middleware/validator/validator";
import RecaptchaMiddleware from "../middleware/recaptchaMiddleware";
import EmailController from "../controllers/emailController";
import { Config } from "../utils/config/config";

export default class EmailRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(EmailController);
        const validator = container.resolve(Validator);
        const captcha = container.resolve(RecaptchaMiddleware);
        const config = container.resolve(Config);
        const recaptchaCfg = config.security.reCaptcha.protectedEndpoints;

        if (!config.localLogin.email.required) {
            return router;
        }

        router.post(
            "/confirm",
            validator.confirmEmail,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, recaptchaCfg.confirmEmail),
            (req: Request, res: Response, next: NextFunction) => ctrl.confirmEmail(req, res, next)
        );

        router.post(
            "/resend",
            validator.resendEmail,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, recaptchaCfg.resendEmail),
            (req: Request, res: Response, next: NextFunction) => ctrl.resendEmail(req, res, next)
        );

        return router;
    }
}
