import express, { NextFunction, Request, Response, Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "tsyringe";

import ExternalUserController from "../../controllers/user/externalUserController";
import { ExternalLoginProvider } from "../../dal/entities/externalLoginEntity";
import AuthMiddleware from "../../middleware/authMiddleware";
import UserAgentMiddleware from "../../middleware/userAgentMiddleware";
import Validator from "../../middleware/validator/validator";
import { Config } from "../../utils/config/config";

export default class ExternalUserRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(ExternalUserController);
        const auth = container.resolve(AuthMiddleware);
        const validator = container.resolve(Validator);
        const config = container.resolve(Config).externalLogin;
        const uaMiddleware = container.resolve(UserAgentMiddleware);

        if (config.google.enabled) {
            router.post(
                "/google",
                validator.loginWithGoogle,
                (req: Request, res: Response, next: NextFunction) => auth.authGoogle(req, res, next),
                (req: Request, res: Response, next: NextFunction) => uaMiddleware.parse(req, res, next),
                asyncHandler((req: Request, res: Response, next: NextFunction) =>
                    ctrl.registerOrLogin(req, res, next, ExternalLoginProvider.google)
                )
            );
        }

        if (config.facebook.enabled) {
            router.post(
                "/facebook",
                validator.loginWithFacebook,
                (req: Request, res: Response, next: NextFunction) => auth.authFacebook(req, res, next),
                (req: Request, res: Response, next: NextFunction) => uaMiddleware.parse(req, res, next),
                asyncHandler((req: Request, res: Response, next: NextFunction) =>
                    ctrl.registerOrLogin(req, res, next, ExternalLoginProvider.facebook)
                )
            );
        }

        if (config.google.enabled || config.facebook.enabled) {
            router.post(
                "/",
                validator.finishExternalUserRegistration,
                asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.finishRegistration(req, res, next))
            );
        }

        return router;
    }
}
