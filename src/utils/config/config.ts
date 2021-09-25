import fs from "fs";

import { AuthMode } from "../../models/authMode";
import { FieldConfig } from "./fieldConfig";
import { PasswordFieldConfig } from "./passwordFieldConfig";

export class Config {
    mode: AuthMode;
    redis: {
        host: string;
        port: number;
        password?: string;
    };
    security: {
        mfa: {
            enabled: boolean;
            appName: string;
            loginTokenTTLSeconds: number;
            maxInvalidAttempts: number;
        };
        reCaptcha: {
            enabled: boolean;
            ssl: boolean;
            protectedEndpoints: {
                register: boolean;
                login: boolean;
                forgotPassword: boolean;
                resetPassword: boolean;
                confirmEmail: boolean;
                resendEmail: boolean;
                confirmPhone: boolean;
                resendPhone: boolean;
            };
        };
    };
    session: {
        maxPerUser: number;
        TTLHours: number;
        cookie: {
            sameSite: "none" | "lax";
            secure: boolean;
        };
        cacheExpirationSeconds: number;
    };
    localLogin: {
        allowLoginWithoutConfirmedEmail: boolean;
        allowLoginWithoutConfirmedPhone: boolean;
        email: {
            required: boolean;
            allowLogin: boolean;
            resendLimit: number;
            resendTimeLimitSeconds: number;
        };
        username: {
            required: boolean;
            allowLogin: boolean;
            hashKey: string;
        };
        phone: {
            required: boolean;
            allowLogin: boolean;
            resendLimit: number;
            resendTimeLimitSeconds: number;
        };
    };
    externalLogin: {
        google: {
            enabled: boolean;
            clientId: string;
        };
        facebook: {
            enabled: boolean;
            clientId: string;
            clientSecret: string;
        };
    };
    passwordReset: {
        codeExpirationTimeInMinutes: number;
        method: "email" | "phone";
    };
    commonFields: {
        email: FieldConfig;
        username: FieldConfig;
        password: PasswordFieldConfig;
    };
    additionalFields: {
        registerEndpoint: {
            [key: string]: FieldConfig;
        };
    };
}

export class ConfigLoader {
    private constructor() {}

    public static load(jsonConfigPath: string): Config {
        if (!fs.existsSync(jsonConfigPath)) {
            throw new Error("Cannot load config.json file");
        }

        return JSON.parse(fs.readFileSync(jsonConfigPath).toString());
    }
}
