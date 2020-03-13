import dotenv from "dotenv";
import fs from "fs";
import { ConfigValidationResult } from "./configValidationResult";
import { JsonConfig } from "./jsonConfig";

export default class Config {
    private _jsonConfig: JsonConfig;

    public load(envPath: string, jsonConfigPath: string) {
        const result = dotenv.config({ path: envPath });
        if (result.error) {
            throw new Error(`Cannot load .env file: ${result.error}`);
        }
        let nodeEnv = "production";
        if (process.env.NODE_ENV === "development") {
            nodeEnv = "development";
        }
        process.env.NODE_ENV = nodeEnv;

        if (!fs.existsSync(jsonConfigPath)) {
            throw new Error("Cannot load config.json file");
        }
        this._jsonConfig = JSON.parse(fs.readFileSync(jsonConfigPath).toString());
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

    public isCorsEnabled(): boolean {
        const cors = process.env.CORS;
        if (!cors) {
            return false;
        }
        return cors.toLowerCase() === "true";
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

    public get emailSigKey(): string {
        return process.env.EMAIL_SIG_KEY;
    }

    public get jsonConfig(): JsonConfig {
        return this._jsonConfig;
    }

    public get recaptchaSiteKey(): string {
        return process.env.RECAPTCHA_SITE_KEY;
    }

    public get recaptchaSecretKey(): string {
        return process.env.RECAPTCHA_SECRET_KEY;
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

        if (!this.masterKey || this.masterKey.length < 32) {
            result.push({
                variableName: "MASTER_KEY",
                message: "Minimum required length is 32 characters",
                severity: "error",
            });
        }

        if (!this.jwtPrivateKey || this.jwtPrivateKey.length < 32) {
            result.push({
                variableName: "JWT_PRIVATE_KEY",
                message: "Minimum required length is 32 characters",
                severity: "error",
            });
        }

        if (!this.emailSigKey || this.emailSigKey.length < 32) {
            result.push({
                variableName: "EMAIL_SIG_KEY",
                message: "Minimum required length is 32 characters",
                severity: "error",
            });
        }

        return result;
    }
}
