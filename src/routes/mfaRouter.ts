import express, { Request, Response, NextFunction, Router } from "express";
import { container } from "tsyringe";

import Validator from "../middleware/validator/validator";
import AuthMiddleware from "../middleware/authMiddleware";
import MfaController from "../controllers/mfaController";
import Config from "../utils/config/config";

export default class MfaRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(MfaController);
        const auth = container.resolve(AuthMiddleware);
        const validator = container.resolve(Validator);
        const jsonConfig = container.resolve(Config).jsonConfig;

        if (!jsonConfig.security.mfa.enabled) {
            return router;
        }

        router.get(
            "/",
            (req: Request, res: Response, next: NextFunction) => auth.authJwt(req, res, next),
            (req: Request, res: Response, next: NextFunction) => ctrl.requestMfa(req, res, next)
        );

        router.put(
            "/",
            validator.enableMfa,
            (req: Request, res: Response, next: NextFunction) => auth.authJwt(req, res, next),
            (req: Request, res: Response, next: NextFunction) => ctrl.enableMfa(req, res, next)
        );

        router.delete(
            "/",
            validator.disbleMfa,
            (req: Request, res: Response, next: NextFunction) => auth.authJwt(req, res, next),
            (req: Request, res: Response, next: NextFunction) => ctrl.disableMfa(req, res, next)
        );

        return router;
    }
}
