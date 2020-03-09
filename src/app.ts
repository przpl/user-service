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
        process.exit(1);
    }

    let atLeastOneError = false;
    const configValidationResult = config.validate();
    if (configValidationResult.length > 0) {
        for (const result of configValidationResult) {
            if (result.severity === "error") {
                atLeastOneError = true;
                console.error(`Config validation error: ${result.variableName} - ${result.message}`);
            } else {
                console.warn(`Config validation warning: ${result.variableName} - ${result.message}`);
            }
        }
        if (atLeastOneError) {
            process.exit(1);
        }
    }

    let dbConnection: Connection;
    try {
        dbConnection = await createConnection();
    } catch (error) {
        console.log(error);
        process.exit(1);
    }

    const app = express();
    if (config.isDev()) {
        app.use(morgan("dev"));
    }
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    const serviceController = new ServiceController(config);
    app.use("/api/service", ServiceRouter.getExpressRouter(serviceController)); // TODO endpoints that allows hot reloading .env variables

    const userController = new UserController(new UserManager(config.emailSigKey), new JwtService(config.jwtPrivateKey, config.tokenTTLMinutes));
    app.use("/api/user", UserRouter.getExpressRouter(userController));

    app.use((req, res, next) => handleNotFoundError(res));
    app.use((err: any, req: Request, res: Response, next: NextFunction) => handleError(err, res, config.isDev()));

    app.listen(config.port, () => {
        console.log(`App is running at http://localhost:${config.port} in ${app.get("env")} mode`);
    })
        .on("error", async e => {
            console.log(`Cannot run app: ${e.message}`);
            await dbConnection.close();
            process.exit(1);
        })
        .on("close", async () => {
            await dbConnection.close();
        });
}

start();
