import express, { Request, Response, NextFunction, Router } from "express";

import UserController from "../controllers/userController";
import AuthMiddleware from "../middleware/authMiddleware";

export default class UserRouter {
    static getExpressRouter(controller: UserController, authMiddleware: AuthMiddleware): Router {
        const router = express.Router();

        router.post("/login", authMiddleware.authorizeMasterKey, (req: Request, res: Response, next: NextFunction) =>
            controller.login(req, res, next)
        );

        return router;
    }
}
