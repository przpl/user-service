import express, { Request, Response, NextFunction, Router } from "express";
import { container } from "tsyringe";

import InternalController from "../controllers/internalController";
import InternalAuthMiddleware from "../middleware/internalAuthMiddleware";

export default class InternalRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(InternalController);
        const auth = container.resolve(InternalAuthMiddleware);

        router.use((req: Request, res: Response, next: NextFunction) => auth.isInternalRequest(req, res, next));

        router.post("/roles", (req: Request, res: Response, next: NextFunction) => ctrl.addRoleToUser(req, res, next));

        router.delete("/roles", (req: Request, res: Response, next: NextFunction) => ctrl.removeRoleFromUser(req, res, next));

        router.delete("/sessions/:userId", (req: Request, res: Response, next: NextFunction) => ctrl.revokeAllUserSessions(req, res, next));

        router.post("/locks/:userId", (req: Request, res: Response, next: NextFunction) => ctrl.lockOutUser(req, res, next));

        router.delete("/locks/:userId", (req: Request, res: Response, next: NextFunction) => ctrl.unlockUser(req, res, next));

        return router;
    }
}
