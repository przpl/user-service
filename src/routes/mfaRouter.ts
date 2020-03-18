import express, { Request, Response, NextFunction, Router } from "express";

import Validator from "../middleware/validator/validator";
import AuthMiddleware from "../middleware/authMiddleware";
import { JsonConfig } from "../utils/config/jsonConfig";
import MfaController from "../controllers/mfaController";

export default class MfaRouter {
    static getExpressRouter(controller: MfaController, auth: AuthMiddleware, validator: Validator, jsonConfig: JsonConfig): Router {
        const router = express.Router();

        if (jsonConfig.security.mfa.enabled) {
            router.get(
                "/",
                (req: Request, res: Response, next: NextFunction) => auth.authJwt(req, res, next),
                (req: Request, res: Response, next: NextFunction) => controller.requestMfa(req, res, next)
            );

            router.put(
                "/",
                validator.enableMfa,
                (req: Request, res: Response, next: NextFunction) => auth.authJwt(req, res, next),
                (req: Request, res: Response, next: NextFunction) => controller.enableMfa(req, res, next)
            );

            router.delete(
                "/",
                validator.disbleMfa,
                (req: Request, res: Response, next: NextFunction) => auth.authJwt(req, res, next),
                (req: Request, res: Response, next: NextFunction) => controller.disableMfa(req, res, next)
            );
        }

        return router;
    }
}
