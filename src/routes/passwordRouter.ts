import express, { Request, Response, NextFunction, Router } from "express";
import { container } from "tsyringe";
import asyncHandler from "express-async-handler";

import Validator from "../middleware/validator/validator";
import AuthMiddleware from "../middleware/authMiddleware";
import ReCaptchaMiddleware from "../middleware/reCaptchaMiddleware";
import PasswordController from "../controllers/passwordController";
import { Config } from "../utils/config/config";

export default class PasswordRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(PasswordController);
        const auth = container.resolve(AuthMiddleware);
        const validator = container.resolve(Validator);
        const captcha = container.resolve(ReCaptchaMiddleware);
        const reCaptchaEnabled = container.resolve(Config).security.reCaptcha.protectedEndpoints;

        router.post(
            "/change",
            (req: Request, res: Response, next: NextFunction) => auth.authJwt(req, res, next),
            validator.changePassword,
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.changePassword(req, res, next))
        );

        router.post(
            "/forgot",
            validator.forgotPassword,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, reCaptchaEnabled.forgotPassword),
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.forgotPassword(req, res, next))
        );

        router.post(
            "/reset",
            validator.resetPassword,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, reCaptchaEnabled.resetPassword),
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.resetPassword(req, res, next))
        );

        return router;
    }
}
