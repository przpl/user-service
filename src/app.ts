import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import { createConnection, Connection } from "typeorm";

import Config from "./utils/config/config";
import UserRouter from "./routes/userRouter";
import UserController from "./controllers/userController";
import { handleNotFoundError, handleError } from "./utils/expressUtils";
import ServiceRouter from "./routes/serviceRouter";
import { UserManager } from "./managers/userManger";
import ServiceController from "./controllers/serviceController";
import { JwtService } from "./services/jwtService";
import Validator from "./middleware/validator";
import AuthMiddleware from "./middleware/authMiddleware";
import { CryptoService } from "./services/cryptoService";

function loadConfig() {
    const envPath = `${__dirname}/.env`;
    const configPath = `${__dirname}/config.json`;
    const config = new Config();
    try {
        config.load(envPath, configPath);
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
                console.error(`\x1b[31mConfig validation error: ${result.variableName} - ${result.message}`);
            } else {
                console.warn(`\x1b[33mConfig validation warning: ${result.variableName} - ${result.message}`);
            }
        }
        if (atLeastOneError) {
            process.exit(1);
        }
    }

    return config;
}

async function connectToDb() {
    let conn: Connection;
    try {
        conn = await createConnection();
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
    return conn;
}

async function start() {
    const config = loadConfig();
    const dbConnection = await connectToDb();

    const app = express();
    if (config.isDev()) {
        app.use(morgan("dev"));
    }
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    const jwtService = new JwtService(config.jwtPrivateKey, config.tokenTTLMinutes);
    const cryptoService = new CryptoService(config.jsonConfig.security.bcryptRounds);

    const validator = new Validator(config.jsonConfig);
    const authMiddleware = new AuthMiddleware(jwtService);

    const userManager = new UserManager(cryptoService, config.emailSigKey, config.jsonConfig.passwordReset.codeExpirationTimeInMinutes);

    const serviceController = new ServiceController(config);
    const userController = new UserController(userManager, jwtService);

    app.use("/api/service", ServiceRouter.getExpressRouter(serviceController));
    app.use("/api/user", UserRouter.getExpressRouter(userController, authMiddleware, validator));

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
