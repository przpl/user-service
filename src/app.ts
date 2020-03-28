import "reflect-metadata"; // required by IoC Container
import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createConnection, Connection } from "typeorm";
import { container } from "tsyringe";

import LocalUserRouter from "./routes/user/localUserRouter";
import ServiceRouter from "./routes/serviceRouter";
import PasswordRouter from "./routes/passwordRouter";
import EmailRouter from "./routes/emailRouter";
import TokenRouter from "./routes/tokenRouter";
import ExternalUserRouter from "./routes/user/externalUserRouter";
import MfaRouter from "./routes/mfaRouter";
import InternalRouter from "./routes/internalRouter";

import Config from "./utils/config/config";
import { handleNotFoundError, handleError } from "./utils/expressUtils";
import { configurePassport } from "./middleware/passport";

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
    container.register<Config>(Config, { useValue: config });
    const dbConnection = await connectToDb();

    const app = express();
    if (config.isDev()) {
        app.use(morgan("dev"));
    }
    if (config.isCorsEnabled()) {
        app.use(cors());
    }
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.set("trust proxy", true);
    configurePassport(app, config.jsonConfig);

    app.use("/api/service", ServiceRouter.getExpressRouter());
    app.use("/api/internal", InternalRouter.getExpressRouter());
    app.use("/api/user", LocalUserRouter.getExpressRouter());
    app.use("/api/user/external", ExternalUserRouter.getExpressRouter());
    app.use("/api/user/password", PasswordRouter.getExpressRouter());
    app.use("/api/user/email", EmailRouter.getExpressRouter());
    app.use("/api/user/token", TokenRouter.getExpressRouter());
    app.use("/api/user/mfa", MfaRouter.getExpressRouter());

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
