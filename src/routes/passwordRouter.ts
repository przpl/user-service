import express, { Request, Response, NextFunction, Router } from "express";

import Validator from "../middleware/validator";
import AuthMiddleware from "../middleware/authMiddleware";
import RecaptchaMiddleware from "../middleware/recaptchaMiddleware";
import { JsonConfig } from "../utils/config/jsonConfig";
import PasswordController from "../controllers/passwordController";

export default class PasswordRouter {
    static getExpressRouter(
        controller: PasswordController,
        auth: AuthMiddleware,
        validator: Validator,
        captcha: RecaptchaMiddleware,
        jsonConfig: JsonConfig
    ): Router {
        const router = express.Router();
        const recaptchaEnabled = jsonConfig.security.reCaptcha.protectedEndpoints;

        router.post(
            "/change",
            (req: Request, res: Response, next: NextFunction) => auth.authJwt(req, res, next),
            validator.changePassword,
            (req: Request, res: Response, next: NextFunction) => controller.changePassword(req, res, next)
        );

        router.post(
            "/forgot",
            validator.forgotPassword,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, recaptchaEnabled.forgotPassword),
            (req: Request, res: Response, next: NextFunction) => controller.forgotPassword(req, res, next)
        );

        router.post(
            "/reset",
            validator.resetPassword,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, recaptchaEnabled.resetPassword),
            (req: Request, res: Response, next: NextFunction) => controller.resetPassword(req, res, next)
        );

        return router;
    }
}
