import express, { NextFunction, Request, Response, Router } from "express";
import { container } from "tsyringe";

import ServiceController from "../controllers/serviceController";

export default class ServiceRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(ServiceController);

        router.get("/status", (req: Request, res: Response, next: NextFunction) => ctrl.status(req, res, next));

        return router;
    }
}
