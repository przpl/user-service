import "reflect-metadata"; // required by IoC Container

import path from "path";

import * as Sentry from "@sentry/node";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { container } from "tsyringe";
import { Connection, createConnection } from "typeorm";

import { configurePassport } from "./middleware/passport";
import EmailRouter from "./routes/emailRouter";
import InternalRouter from "./routes/internalRouter";
import MfaRouter from "./routes/mfaRouter";
import PasswordRouter from "./routes/passwordRouter";
import PhoneRouter from "./routes/phoneRouter";
import ServiceRouter from "./routes/serviceRouter";
import TokenRouter from "./routes/tokenRouter";
import ExternalUserRouter from "./routes/user/externalUserRouter";
import LocalUserRouter from "./routes/user/localUserRouter";
import UserRouter from "./routes/user/userRouter";
import { MessageBroker } from "./services/messageBroker";
import { Config, ConfigLoader } from "./utils/config/config";
import Env from "./utils/config/env";
import { handleError, handleNotFoundError } from "./utils/expressUtils";
import Logger from "./utils/logger";
import SecurityLogger from "./utils/securityLogger";

let logger: Logger;

function loadEnv() {
    const envPath = path.resolve(__dirname, "..", ".env");
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
    const configPath = path.resolve(__dirname, "..", "config.json");
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
        printError(error.message);
        logger.error(error.message);
        process.exit(1);
    }

    if (await conn.showMigrations()) {
        const msg = "There are pending migrations to be executed using `typeorm migration:run`.";
        printError(msg);
        logger.error(msg);
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
        console.log("Connected to message broker");
    } catch (error) {
        const msg = `Error with message broker: ${error}`;
        printError(msg);
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
    app.use(cors({ credentials: true, origin: env.cors }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(helmet());
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

    app.use((req, res, next) => handleNotFoundError(res, env.isDev()));
    app.use((err: any, req: Request, res: Response, next: NextFunction) => handleError(err, req, res, env.isDev(), env.sentryKey));

    app.disable("x-powered-by");

    app.listen(env.port, () => {
        console.log(`App is running at http://localhost:${env.port} in ${app.get("env")} mode`);
    })
        .on("error", async (e) => {
            printError(`Cannot run app: ${e.message}`);
            await dbConnection.close();
            process.exit(1);
        })
        .on("close", async () => {
            await dbConnection.close();
        });

    process.on("unhandledRejection", (err: any) => {
        if (env.isDev()) {
            printError("Unhandled promise rejection: " + err.message);
            printError(err.stack);
        }
        if (env.sentryKey) {
            Sentry.captureException(err);
        }
    });
}

function printError(msg: string) {
    console.error("\x1b[31m", msg, "\x1b[0m");
}

start();
