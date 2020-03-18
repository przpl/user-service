import express, { Request, Response, NextFunction, Router } from "express";

import Validator from "../middleware/validator/validator";
import RecaptchaMiddleware from "../middleware/recaptchaMiddleware";
import { JsonConfig } from "../utils/config/jsonConfig";
import EmailController from "../controllers/emailController";

export default class EmailRouter {
    static getExpressRouter(controller: EmailController, validator: Validator, captcha: RecaptchaMiddleware, jsonConfig: JsonConfig): Router {
        const router = express.Router();
        const recaptchaEnabled = jsonConfig.security.reCaptcha.protectedEndpoints;

        router.post(
            "/confirm",
            validator.confirmEmail,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, recaptchaEnabled.confirmEmail),
            (req: Request, res: Response, next: NextFunction) => controller.confirmEmail(req, res, next)
        );

        router.post(
            "/resend",
            validator.resendEmail,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, recaptchaEnabled.resendEmail),
            (req: Request, res: Response, next: NextFunction) => controller.resendEmail(req, res, next)
        );

        return router;
    }
}
