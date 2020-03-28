import express, { Request, Response, NextFunction, Router } from "express";
import { container } from "tsyringe";

import Validator from "../middleware/validator/validator";
import AuthMiddleware from "../middleware/authMiddleware";
import RecaptchaMiddleware from "../middleware/recaptchaMiddleware";
import PasswordController from "../controllers/passwordController";
import Config from "../utils/config/config";

export default class PasswordRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(PasswordController);
        const auth = container.resolve(AuthMiddleware);
        const validator = container.resolve(Validator);
        const captcha = container.resolve(RecaptchaMiddleware);
        const recaptchaEnabled = container.resolve(Config).jsonConfig.security.reCaptcha.protectedEndpoints;

        router.post(
            "/change",
            (req: Request, res: Response, next: NextFunction) => auth.authJwt(req, res, next),
            validator.changePassword,
            (req: Request, res: Response, next: NextFunction) => ctrl.changePassword(req, res, next)
        );

        router.post(
            "/forgot",
            validator.forgotPassword,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, recaptchaEnabled.forgotPassword),
            (req: Request, res: Response, next: NextFunction) => ctrl.forgotPassword(req, res, next)
        );

        router.post(
            "/reset",
            validator.resetPassword,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, recaptchaEnabled.resetPassword),
            (req: Request, res: Response, next: NextFunction) => ctrl.resetPassword(req, res, next)
        );

        return router;
    }
}
