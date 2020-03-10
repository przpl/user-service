import express, { Request, Response, NextFunction, Router } from "express";

import UserController from "../controllers/userController";
import Validator from "../middleware/validator";
import AuthMiddleware from "../middleware/authMiddleware";

export default class UserRouter {
    static getExpressRouter(controller: UserController, authMiddleware: AuthMiddleware, validator: Validator): Router {
        const router = express.Router();

        router.post("/register", validator.register, (req: Request, res: Response, next: NextFunction) => controller.register(req, res, next));

        router.post("/login", validator.login, (req: Request, res: Response, next: NextFunction) => controller.login(req, res, next));

        router.post(
            "/password",
            (req: Request, res: Response, next: NextFunction) => authMiddleware.decodeAccessToken(req, res, next),
            validator.changePassword,
            (req: Request, res: Response, next: NextFunction) => controller.changePassword(req, res, next)
        );

        router.post("/token/refresh", validator.refreshToken, (req: Request, res: Response, next: NextFunction) =>
            controller.refreshAccessToken(req, res, next)
        );

        router.post("/email/confirm", validator.confirmEmail, (req: Request, res: Response, next: NextFunction) =>
            controller.confirmEmail(req, res, next)
        );

        return router;
    }
}
