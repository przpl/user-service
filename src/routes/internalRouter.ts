import express, { NextFunction, Request, Response, Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "tsyringe";

import InternalController from "../controllers/internalController";
import InternalAuthMiddleware from "../middleware/internalAuthMiddleware";
import InternalValidator from "../middleware/validator/internalValidator";

export default class InternalRouter {
    static getExpressRouter(): Router {
        const router = express.Router();
        const ctrl = container.resolve(InternalController);
        const auth = container.resolve(InternalAuthMiddleware);
        const validator = container.resolve(InternalValidator);

        router.use((req: Request, res: Response, next: NextFunction) => auth.isInternalRequest(req, res, next));

        router.post(
            "/roles",
            validator.role,
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.addRoleToUser(req, res, next))
        );

        router.delete(
            "/roles",
            validator.role,
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.removeRoleFromUser(req, res, next))
        );

        router.delete(
            "/sessions/:userId",
            validator.userIdParam,
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.revokeAllUserSessions(req, res, next))
        );

        router.post(
            "/locks/:userId",
            validator.userIdParam,
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.lockOutUser(req, res, next))
        );

        router.delete(
            "/locks/:userId",
            validator.userIdParam,
            asyncHandler((req: Request, res: Response, next: NextFunction) => ctrl.unlockUser(req, res, next))
        );

        return router;
    }
}
