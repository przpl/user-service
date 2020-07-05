import "reflect-metadata"; // required by IoC Container
import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createConnection, Connection } from "typeorm";
import { container } from "tsyringe";
import * as Sentry from "@sentry/node";

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
import Logger from "./utils/logger";
import SecurityLogger from "./utils/securityLogger";
import { MessageBroker } from "./services/messageBroker";

let logger: Logger;

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
        console.log(error.message);
        logger.error(error.message);
        process.exit(1);
    }
    return conn;
}

async function connectToMessageBroker(env: Env) {
    const messageBroker = new MessageBroker(
        env.messageBroker.host,
        env.messageBroker.port,
        env.messageBroker.username,
        env.messageBroker.password
    );
    try {
        await messageBroker.connectAndSubscribe();
        console.log("Connected with message broker");
    } catch (error) {
        const msg = `Error with message broker: ${error}`;
        console.log(msg);
        logger.error(msg);
        process.exit(1);
    }
    return messageBroker;
}

async function start() {
    const env = loadEnv();

    if (env.sentryKey) {
        Sentry.init({ dsn: env.sentryKey });
    }

    const config = loadConfig();

    logger = new Logger(env.loggerDisabled, env.loggerLevel);
    container.register<Logger>(Logger, { useValue: logger });
    container.register<SecurityLogger>(SecurityLogger, { useValue: new SecurityLogger(false) });

    const dbConnection = await connectToDb();
    const messageBroker = await connectToMessageBroker(env);

    container.register<Env>(Env, { useValue: env });
    container.register<Config>(Config, { useValue: config });
    container.register<MessageBroker>(MessageBroker, { useValue: messageBroker });

    const app = express();
    if (env.isDev()) {
        app.use(morgan("dev"));
    }
    if (env.isCorsEnabled()) {
        app.use(cors()); // TO-DO origin URL configuration
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
    app.use((err: any, req: Request, res: Response, next: NextFunction) => handleError(err, req, res, env.isDev(), env.sentryKey));

    app.listen(env.port, () => {
        console.log(`App is running at http://localhost:${env.port} in ${app.get("env")} mode`);
    })
        .on("error", async (e) => {
            console.log(`Cannot run app: ${e.message}`);
            await dbConnection.close();
            process.exit(1);
        })
        .on("close", async () => {
            await dbConnection.close();
        });

    process.on("unhandledRejection", (err: any) => {
        if (env.isDev()) {
            console.log("Unhandled promise rejection: " + err.message);
            console.log(err.stack);
        }
        if (env.sentryKey) {
            Sentry.captureException(err);
        }
    });
}

start();
