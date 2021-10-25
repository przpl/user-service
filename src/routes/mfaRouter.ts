import express, { NextFunction, Request, Response, Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "tsyringe";

import MfaController from "../controllers/mfaController";
import AuthMiddleware from "../middleware/authMiddleware";
import { emptyMiddleware } from "../middleware/emptyMiddleware";
import Validator from "../middleware/validator/validator";
import XsrfMiddleware from "../middleware/xsrfMiddleware";
import { Config } from "../utils/config/config";

export default class MfaRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(MfaController);
        const auth = container.resolve(AuthMiddleware);
        const xsrf = container.resolve(XsrfMiddleware);
        const validator = container.resolve(Validator);
        const config = container.resolve(Config);

        if (!config.security.mfa.enabled) {
            return router;
        }

        router.get(
            "/",
            (req: Request, res: Response, next: NextFunction) => auth.authenticate(config.mode, req, res, next),
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.requestMfa(req, res, next))
        );

        router.put(
            "/",
            validator.enableMfa,
            (req: Request, res: Response, next: NextFunction) => auth.authenticate(config.mode, req, res, next),
            (req: Request, res: Response, next: NextFunction) =>
                config.mode === "session" ? xsrf.validate(req, res, next) : emptyMiddleware(req, res, next),
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.enableMfa(req, res, next))
        );

        router.delete(
            "/",
            validator.disableMfa,
            (req: Request, res: Response, next: NextFunction) => auth.authenticate(config.mode, req, res, next),
            (req: Request, res: Response, next: NextFunction) =>
                config.mode === "session" ? xsrf.validate(req, res, next) : emptyMiddleware(req, res, next),
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.disableMfa(req, res, next))
        );

        return router;
    }
}
