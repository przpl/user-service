/* eslint-disable no-console */
import "reflect-metadata"; // required by IoC Container

import * as Sentry from "@sentry/node";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { createClient } from "redis";
import { container } from "tsyringe";
import { DataSource } from "typeorm";

import { dataSource } from "./dataSource";
import { BaseSessionManager } from "./managers/session/baseSessionManager";
import { CookieSessionManager } from "./managers/session/cookieSessionManager";
import { JwtSessionManager } from "./managers/session/jwtSessionManager";
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
import { UsernameBasedIdGenerator } from "./services/generators/usernameBasedIdGenerator";
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
    env.load(envPath);

    process.env.TYPEORM_ENTITIES = "dist/dal/entities/**/*.js";
    process.env.TYPEORM_MIGRATIONS = "dist/dal/migrations/*.js";

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
    return ConfigLoader.load(configPath);
}

async function connectToDb() {
    await dataSource.initialize();

    const args = process.argv.slice(2);
    if (args.includes("-migrate")) {
        await dataSource.runMigrations();
    }

    if (await dataSource.showMigrations()) {
        const msg = "There are pending migrations to be executed using `typeorm migration:run`.";
        printError(msg);
        logger.error(msg);
        process.exit(1);
    }

    return dataSource;
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
    container.registerInstance(Logger, logger);
    container.registerInstance(SecurityLogger, new SecurityLogger(false));

    const dataSource = await connectToDb();
    const messageBroker = await connectToMessageBroker(env);

    container.registerInstance(DataSource, dataSource);
    container.registerInstance(Env, env);
    container.registerInstance(Config, config);
    container.registerInstance(MessageBroker, messageBroker);
    container.registerType("UserIdGenerator", UsernameBasedIdGenerator);

    const redisClient = createClient({
        socket: { host: config.redis.host || "127.0.0.1", port: config.redis.port || 6379 },
        password: config.redis.password,
    });
    await redisClient.connect();
    container.registerInstance("redisClient", redisClient);
    console.log("Connected to Redis");

    if (config.mode === "session") {
        container.registerType(BaseSessionManager.name, CookieSessionManager);
    } else if (config.mode === "jwt") {
        container.registerType(BaseSessionManager.name, JwtSessionManager);
    } else {
        throw new Error("Unknown mode.");
    }

    const app = express();
    if (env.isDev()) {
        app.use(morgan("dev") as any);
    }
    app.use(cors({ credentials: true, origin: env.cors }));
    app.use(express.json() as any);
    app.use(express.urlencoded({ extended: false }) as any);
    app.use(cookieParser());
    app.use(helmet() as any);
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

    app.use((req, res) => handleNotFoundError(res, env.isDev()));
    app.use((err: any, req: Request, res: Response) => handleError(err, req, res, env.isDev(), env.sentryKey));

    app.disable("x-powered-by");

    app.listen(env.port, () => {
        console.log(`App is running at port ${env.port} in ${app.get("env")} mode`);
    })
        .on("error", async (e) => {
            printError(`Cannot run app: ${e.message}`);
            await dataSource.destroy();
            process.exit(1);
        })
        .on("close", async () => {
            await dataSource.destroy();
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

void start();
