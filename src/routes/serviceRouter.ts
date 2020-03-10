import express, { Request, Response, NextFunction, Router } from "express";

import ServiceController from "../controllers/serviceController";

export default class ServiceRouter {
    static getExpressRouter(controller: ServiceController): Router {
        const router = express.Router();

        router.get("/status", (req: Request, res: Response, next: NextFunction) => controller.status(req, res, next));

        return router;
    }
}
