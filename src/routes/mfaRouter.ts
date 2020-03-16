import express, { Request, Response, NextFunction, Router } from "express";

import Validator from "../middleware/validator";
import AuthMiddleware from "../middleware/authMiddleware";
import { JsonConfig } from "../utils/config/jsonConfig";
import MfaController from "../controllers/mfaController";

export default class MfaRouter {
    static getExpressRouter(controller: MfaController, auth: AuthMiddleware, validator: Validator, jsonConfig: JsonConfig): Router {
        const router = express.Router();

        if (jsonConfig.security.twoFaToken.enabled) {
            router.get(
                "/",
                (req: Request, res: Response, next: NextFunction) => auth.authJwt(req, res, next),
                (req: Request, res: Response, next: NextFunction) => controller.requestTwoFa(req, res, next)
            );

            router.put(
                "/",
                validator.enableTwoFa,
                (req: Request, res: Response, next: NextFunction) => auth.authJwt(req, res, next),
                (req: Request, res: Response, next: NextFunction) => controller.enableTwoFa(req, res, next)
            );

            router.delete(
                "/",
                validator.disbleTwoFa,
                (req: Request, res: Response, next: NextFunction) => auth.authJwt(req, res, next),
                (req: Request, res: Response, next: NextFunction) => controller.disableTwoFa(req, res, next)
            );
        }

        return router;
    }
}
