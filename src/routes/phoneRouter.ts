import express, { Request, Response, NextFunction, Router } from "express";
import { container } from "tsyringe";

import Validator from "../middleware/validator/validator";
import RecaptchaMiddleware from "../middleware/recaptchaMiddleware";
import { Config } from "../utils/config/config";
import ConfirmationController from "../controllers/confirmationController";

export default class PhoneRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(ConfirmationController);
        const validator = container.resolve(Validator);
        const captcha = container.resolve(RecaptchaMiddleware);
        const config = container.resolve(Config);
        const recaptchaCfg = config.security.reCaptcha.protectedEndpoints;

        if (!config.localLogin.phone.required) {
            return router;
        }

        router.post(
            "/confirm",
            validator.confirmPhone,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, recaptchaCfg.confirmPhone),
            (req: Request, res: Response, next: NextFunction) => ctrl.confirm(req, res, next)
        );

        router.post(
            "/resend",
            validator.resendPhone,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, recaptchaCfg.resendPhone),
            (req: Request, res: Response, next: NextFunction) => ctrl.resend(req, res, next)
        );

        return router;
    }
}
