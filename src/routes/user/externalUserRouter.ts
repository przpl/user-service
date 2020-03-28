import express, { Request, Response, NextFunction, Router } from "express";
import { container } from "tsyringe";

import Validator from "../../middleware/validator/validator";
import AuthMiddleware from "../../middleware/authMiddleware";
import { ExternalLoginProvider } from "../../dal/entities/externalLogin";
import ExternalUserController from "../../controllers/user/externalUserController";
import UserAgentMiddleware from "../../middleware/userAgentMiddleware";
import Config from "../../utils/config/config";

export default class ExternalUserRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(ExternalUserController);
        const auth = container.resolve(AuthMiddleware);
        const validator = container.resolve(Validator);
        const jsonConfig = container.resolve(Config).jsonConfig;
        const uaMiddleware = container.resolve(UserAgentMiddleware);

        if (jsonConfig.externalLogin.google.enabled) {
            router.post(
                "/google",
                validator.loginWithGoogle,
                (req: Request, res: Response, next: NextFunction) => auth.authGoogle(req, res, next),
                (req: Request, res: Response, next: NextFunction) => uaMiddleware.parse(req, res, next),
                (req: Request, res: Response, next: NextFunction) => ctrl.loginWithExternalProvider(req, res, next, ExternalLoginProvider.google)
            );
        }

        if (jsonConfig.externalLogin.facebook.enabled) {
            router.post(
                "/facebook",
                validator.loginWithFacebook,
                (req: Request, res: Response, next: NextFunction) => auth.authFacebook(req, res, next),
                (req: Request, res: Response, next: NextFunction) => uaMiddleware.parse(req, res, next),
                (req: Request, res: Response, next: NextFunction) => ctrl.loginWithExternalProvider(req, res, next, ExternalLoginProvider.facebook)
            );
        }

        return router;
    }
}
