import express, { Request, Response, NextFunction, Router } from "express";

import UserController from "../controllers/userController";
import AuthMiddleware from "../middleware/authMiddleware";
import Validator from "../managers/validator";

export default class UserRouter {
    static getExpressRouter(controller: UserController, authMiddleware: AuthMiddleware): Router {
        const router = express.Router();
        const validator = new Validator();

        router.post("/register", authMiddleware.authorizeMasterKey, validator.register, (req: Request, res: Response, next: NextFunction) =>
            controller.register(req, res, next)
        );

        return router;
    }
}
