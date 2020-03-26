import express, { Request, Response, NextFunction, Router } from "express";

import Validator from "../../middleware/validator/validator";
import AuthMiddleware from "../../middleware/authMiddleware";
import { JsonConfig } from "../../utils/config/jsonConfig";
import { ExternalLoginProvider } from "../../dal/entities/externalLogin";
import ExternalUserController from "../../controllers/user/externalUserController";
import UserAgentMiddleware from "../../middleware/userAgentMiddleware";

export default class ExternalUserRouter {
    static getExpressRouter(controller: ExternalUserController, auth: AuthMiddleware, validator: Validator, jsonConfig: JsonConfig): Router {
        const router = express.Router();
        const uaMiddleware = new UserAgentMiddleware();

        if (jsonConfig.externalLogin.google.enabled) {
            router.post(
                "/google",
                validator.loginWithGoogle,
                (req: Request, res: Response, next: NextFunction) => auth.authGoogle(req, res, next),
                (req: Request, res: Response, next: NextFunction) => uaMiddleware.parse(req, res, next),
                (req: Request, res: Response, next: NextFunction) =>
                    controller.loginWithExternalProvider(req, res, next, ExternalLoginProvider.google)
            );
        }

        if (jsonConfig.externalLogin.facebook.enabled) {
            router.post(
                "/facebook",
                validator.loginWithFacebook,
                (req: Request, res: Response, next: NextFunction) => auth.authFacebook(req, res, next),
                (req: Request, res: Response, next: NextFunction) => uaMiddleware.parse(req, res, next),
                (req: Request, res: Response, next: NextFunction) =>
                    controller.loginWithExternalProvider(req, res, next, ExternalLoginProvider.facebook)
            );
        }

        return router;
    }
}
