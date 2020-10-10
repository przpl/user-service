import dotenv from "dotenv";
import { singleton } from "tsyringe";

import { ConfigValidationResult } from "./configValidationResult";
import { LoggerLevel } from "../logger";

@singleton()
export default class Env {
    public load(envPath: string) {
        const result = dotenv.config({ path: envPath });
        if (result.error) {
            throw new Error(`Cannot load .env file: ${result.error}`);
        }
        let nodeEnv = "production";
        if (process.env.NODE_ENV === "development") {
            nodeEnv = "development";
        }
        process.env.NODE_ENV = nodeEnv;
    }

    public get loggerLevel(): LoggerLevel {
        return process.env.LOGGER_LEVEL as LoggerLevel;
    }

    public get loggerDisabled(): boolean {
        return Boolean(process.env.LOGGER_DISABLED);
    }

    public get serviceId(): string {
        return process.env.SERVICE_ID || "UnknownUserService";
    }

    public get environment(): string {
        return process.env.NODE_ENV;
    }

    public isDev(): boolean {
        return process.env.NODE_ENV === "development";
    }

    public get cors(): string[] {
        return process.env.CORS.split(",");
    }

    public get port(): string | number {
        return process.env.PORT || 3000;
    }

    public get administrationKey(): string {
        return process.env.ADMINISTRATION_KEY;
    }

    public get masterKey(): string {
        return process.env.MASTER_KEY;
    }

    public get tokenTTLMinutes(): number {
        return Number(process.env.JWT_TOKEN_TTL_MINUTES || 15);
    }

    public get jwtPrivateKey(): string {
        return process.env.JWT_PRIVATE_KEY;
    }

    public get reCaptchaSiteKey(): string {
        return process.env.RECAPTCHA_SITE_KEY;
    }

    public get reCaptchaSecretKey(): string {
        return process.env.RECAPTCHA_SECRET_KEY;
    }

    public get sentryKey(): string {
        return process.env.SENTRY_KEY;
    }

    public get messageBroker(): { host: string; port: number; username: string; password: string } {
        return {
            host: process.env.MESSAGE_BROKER_HOST || "localhost",
            port: process.env.MESSAGE_BROKER_PORT ? Number(process.env.MESSAGE_BROKER_PORT) : 5672,
            username: process.env.MESSAGE_BROKER_USER,
            password: process.env.MESSAGE_BROKER_PASSWORD,
        };
    }

    public validate(): ConfigValidationResult[] {
        const result: ConfigValidationResult[] = [];
        if (!this.administrationKey) {
            result.push({
                variableName: "ADMINISTRATION_KEY",
                message: "It's recommended to protect administration endpoint with a key",
                severity: "warning",
            });
        }

        if (!this.masterKey || this.masterKey.length < 20) {
            result.push({
                variableName: "MASTER_KEY",
                message: "Minimum required length is 20 characters",
                severity: "error",
            });
        }

        if (!this.jwtPrivateKey || this.jwtPrivateKey.length < 44) {
            result.push({
                variableName: "JWT_PRIVATE_KEY",
                message: "Minimum required length is 44 characters in Base64",
                severity: "error",
            });
        }

        return result;
    }
}
