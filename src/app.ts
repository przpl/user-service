import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import { createConnection, Connection } from "typeorm";

import Config from "./utils/config";
import UserRouter from "./routes/userRouter";
import UserController from "./controllers/userController";
import { handleNotFoundError, handleError, handleServerStatusRequest } from "./utils/expressUtils";
import AuthMiddleware from "./middleware/authMiddleware";

async function start() {
    const config = new Config();
    try {
        config.load(__dirname + "/.env");
    } catch (error) {
        console.error(error.message);
        return;
    }

    let dbConnection: Connection;
    try {
        dbConnection = await createConnection();
    } catch (error) {
        console.log(error);
        return;
    }

    const app = express();
    if (config.isDev()) {
        app.use(morgan("dev"));
    }
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    app.get("/api/service-status", (req, res) => handleServerStatusRequest(config, req, res));

    const authMiddleware = new AuthMiddleware(config.masterKey);
    const exampleController = new UserController();
    app.use("/api/user", UserRouter.getExpressRouter(exampleController, authMiddleware));

    app.use((req, res, next) => handleNotFoundError(res));
    app.use((err: any, req: Request, res: Response, next: NextFunction) => handleError(err, res, config.isDev()));

    app.listen(config.port, () => {
        console.log(`App is running at http://localhost:${config.port} in ${app.get("env")} mode`);
    })
        .on("error", e => {
            console.log(`Cannot run app: ${e.message}`);
        })
        .on("close", async () => {
            await dbConnection.close();
        });
}

start();
