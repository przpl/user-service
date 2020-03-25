import express, { Request, Response, NextFunction, Router } from "express";

import InternalController from "../controllers/internalController";
import InternalAuthMiddleware from "../middleware/internalAuthMiddleware";

export default class InternalRouter {
    static getExpressRouter(controller: InternalController, auth: InternalAuthMiddleware): Router {
        const router = express.Router();

        router.use((req: Request, res: Response, next: NextFunction) => auth.isInternalRequest(req, res, next));

        router.post("/roles", (req: Request, res: Response, next: NextFunction) => controller.addRoleToUser(req, res, next));

        router.delete("/roles", (req: Request, res: Response, next: NextFunction) => controller.removeRoleFromUser(req, res, next));

        router.delete("/sessions/:userId", (req: Request, res: Response, next: NextFunction) => controller.revokeAllUserSessions(req, res, next));

        return router;
    }
}
