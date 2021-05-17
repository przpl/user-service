import express, { NextFunction, Request, Response, Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "tsyringe";

import ConfirmationController from "../controllers/confirmationController";
import ReCaptchaMiddleware from "../middleware/reCaptchaMiddleware";
import Validator from "../middleware/validator/validator";
import { Config } from "../utils/config/config";

export default class PhoneRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(ConfirmationController);
        const validator = container.resolve(Validator);
        const captcha = container.resolve(ReCaptchaMiddleware);
        const config = container.resolve(Config);
        const reCaptchaCfg = config.security.reCaptcha.protectedEndpoints;

        if (!config.localLogin.phone.required) {
            return router;
        }

        router.post(
            "/confirm",
            validator.confirmPhone,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, reCaptchaCfg.confirmPhone),
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.confirm(req, res, next))
        );

        router.post(
            "/resend",
            validator.resendPhone,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, reCaptchaCfg.resendPhone),
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.resend(req, res, next))
        );

        return router;
    }
}
