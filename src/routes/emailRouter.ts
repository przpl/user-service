import express, { NextFunction, Request, Response, Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "tsyringe";

import EmailController from "../controllers/confirmationController";
import ReCaptchaMiddleware from "../middleware/reCaptchaMiddleware";
import Validator from "../middleware/validator/validator";
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
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.confirm(req, res, next))
        );

        router.post(
            "/resend",
            validator.resendEmail,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, reCaptchaCfg.resendEmail),
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.resend(req, res, next))
        );

        return router;
    }
}
