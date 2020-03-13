import express, { Request, Response, NextFunction, Router } from "express";
import passport from "passport";

import UserController from "../controllers/userController";
import Validator from "../middleware/validator";
import AuthMiddleware from "../middleware/authMiddleware";
import RecaptchaMiddleware from "../middleware/recaptchaMiddleware";
import { JsonConfig } from "../utils/config/jsonConfig";

export default class UserRouter {
    static getExpressRouter(
        controller: UserController,
        auth: AuthMiddleware,
        validator: Validator,
        captcha: RecaptchaMiddleware,
        jsonConfig: JsonConfig
    ): Router {
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

        if (jsonConfig.externalLogin.google.enabled) {
            router.post(
                "/login/google",
                validator.loginWithGoogle,
                (req: Request, res: Response, next: NextFunction) => auth.authGoogle(req, res, next),
                (req: Request, res: Response, next: NextFunction) => controller.loginWithGoogle(req, res, next)
            );
        }

        router.post(
            "/password/change",
            (req: Request, res: Response, next: NextFunction) => auth.authJwt(req, res, next),
            validator.changePassword,
            (req: Request, res: Response, next: NextFunction) => controller.changePassword(req, res, next)
        );

        router.post(
            "/password/forgot",
            validator.forgotPassword,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, recaptchaEnabled.forgotPassword),
            (req: Request, res: Response, next: NextFunction) => controller.forgotPassword(req, res, next)
        );

        router.post(
            "/password/reset",
            validator.resetPassword,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, recaptchaEnabled.resetPassword),
            (req: Request, res: Response, next: NextFunction) => controller.resetPassword(req, res, next)
        );

        router.post("/token/refresh", validator.refreshToken, (req: Request, res: Response, next: NextFunction) =>
            controller.refreshAccessToken(req, res, next)
        );

        router.post(
            "/email/confirm",
            validator.confirmEmail,
            (req: Request, res: Response, next: NextFunction) => captcha.verify(req, res, next, recaptchaEnabled.confirmEmail),
            (req: Request, res: Response, next: NextFunction) => controller.confirmEmail(req, res, next)
        );

        return router;
    }
}
