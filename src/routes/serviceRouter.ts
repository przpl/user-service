import express, { Request, Response, NextFunction, Router } from "express";

import ServiceController from "../controllers/serviceController";
import AuthMiddleware from "../middleware/authMiddleware";

export default class ServiceRouter {
    static getExpressRouter(controller: ServiceController, authMiddleware: AuthMiddleware): Router {
        const router = express.Router();

        router.get("/status", (req: Request, res: Response, next: NextFunction) => controller.status(req, res, next));

        router.get("/config", authMiddleware.authorizeMasterKey, (req: Request, res: Response, next: NextFunction) =>
            controller.getConfig(req, res, next)
        );

        return router;
    }
}
