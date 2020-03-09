import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import { createConnection, Connection } from "typeorm";

import Config from "./utils/config";
import UserRouter from "./routes/userRouter";
import UserController from "./controllers/userController";
import { handleNotFoundError, handleError } from "./utils/expressUtils";
import ServiceRouter from "./routes/serviceRouter";
import { UserManager } from "./managers/userManger";
import ServiceController from "./controllers/serviceController";
import { JwtService } from "./services/jwtService";

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

    const serviceController = new ServiceController(config);
    app.use("/api/service", ServiceRouter.getExpressRouter(serviceController)); // TODO endpoints that allows hot reloading .env variables

    const userController = new UserController(new UserManager(), new JwtService(config.jwtPrivateKey, config.tokenTTLMinutes));
    app.use("/api/user", UserRouter.getExpressRouter(userController));

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
