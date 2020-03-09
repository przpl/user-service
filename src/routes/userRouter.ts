import express, { Request, Response, NextFunction, Router } from "express";

import UserController from "../controllers/userController";
import Validator from "../managers/validator";

export default class UserRouter {
    static getExpressRouter(controller: UserController): Router {
        const router = express.Router();
        const validator = new Validator();

        router.post("/register", validator.register, (req: Request, res: Response, next: NextFunction) => controller.register(req, res, next));

        router.post("/login", validator.login, (req: Request, res: Response, next: NextFunction) => controller.login(req, res, next));

        router.post("/token/refresh", validator.refreshToken, (req: Request, res: Response, next: NextFunction) =>
            controller.refreshAccessToken(req, res, next)
        );

        return router;
    }
}
