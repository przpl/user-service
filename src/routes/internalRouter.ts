import express, { Request, Response, NextFunction, Router } from "express";
import { container } from "tsyringe";
import asyncHandler from "express-async-handler";

import InternalController from "../controllers/internalController";
import InternalAuthMiddleware from "../middleware/internalAuthMiddleware";

export default class InternalRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(InternalController);
        const auth = container.resolve(InternalAuthMiddleware);

        router.use((req: Request, res: Response, next: NextFunction) => auth.isInternalRequest(req, res, next));

        router.post(
            "/roles",
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.addRoleToUser(req, res, next))
        );

        router.delete(
            "/roles",
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.removeRoleFromUser(req, res, next))
        );

        router.delete(
            "/sessions/:userId",
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.revokeAllUserSessions(req, res, next))
        );

        router.post(
            "/locks/:userId",
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.lockOutUser(req, res, next))
        );

        router.delete(
            "/locks/:userId",
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.unlockUser(req, res, next))
        );

        return router;
    }
}
