import "reflect-metadata"; // required by IoC Container
import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createConnection, Connection } from "typeorm";
import { container } from "tsyringe";

import UserRouter from "./routes/user/userRouter";
import LocalUserRouter from "./routes/user/localUserRouter";
import ExternalUserRouter from "./routes/user/externalUserRouter";
import ServiceRouter from "./routes/serviceRouter";
import PasswordRouter from "./routes/passwordRouter";
import EmailRouter from "./routes/emailRouter";
import TokenRouter from "./routes/tokenRouter";
import MfaRouter from "./routes/mfaRouter";
import InternalRouter from "./routes/internalRouter";
import PhoneRouter from "./routes/phoneRouter";

import Env from "./utils/config/env";
import { handleNotFoundError, handleError } from "./utils/expressUtils";
import { configurePassport } from "./middleware/passport";
import { ConfigLoader, Config } from "./utils/config/config";

function loadEnv() {
    const envPath = `${__dirname}/.env`;
    const env = new Env();
    try {
        env.load(envPath);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }

    let atLeastOneError = false;
    const configValidationResult = env.validate();
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

    return env;
}

function loadConfig() {
    const configPath = `${__dirname}/config.json`;
    let config: Config;
    try {
        config = ConfigLoader.load(configPath);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
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
    const env = loadEnv();
    const config = loadConfig();

    const dbConnection = await connectToDb();

    container.register<Env>(Env, { useValue: env });
    container.register<Config>(Config, { useValue: config });

    const app = express();
    if (env.isDev()) {
        app.use(morgan("dev"));
    }
    if (env.isCorsEnabled()) {
        app.use(cors());
    }
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.set("trust proxy", true);
    configurePassport(app, config);

    app.use("/api/service", ServiceRouter.getExpressRouter());
    app.use("/api/internal", InternalRouter.getExpressRouter());

    app.use("/api/user", UserRouter.getExpressRouter());
    app.use("/api/user/local", LocalUserRouter.getExpressRouter());
    app.use("/api/user/external", ExternalUserRouter.getExpressRouter());
    app.use("/api/user/password", PasswordRouter.getExpressRouter());
    app.use("/api/user/email", EmailRouter.getExpressRouter());
    app.use("/api/user/phone", PhoneRouter.getExpressRouter());
    app.use("/api/user/token", TokenRouter.getExpressRouter());
    app.use("/api/user/mfa", MfaRouter.getExpressRouter());

    app.use((req, res, next) => handleNotFoundError(res));
    app.use((err: any, req: Request, res: Response, next: NextFunction) => handleError(err, res, env.isDev()));

    app.listen(env.port, () => {
        console.log(`App is running at http://localhost:${env.port} in ${app.get("env")} mode`);
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
