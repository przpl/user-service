import { FieldConfig } from "./fieldConfig";
import { PasswordFieldConfig } from "./passwordFieldConfig";

export interface JsonConfig {
    redis: {
        host: string;
        port: number;
    };
    security: {
        mfa: {
            enabled: boolean;
            appName: string;
            loginTokenTTLSeconds: number;
        };
        bcryptRounds: number;
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
            };
        };
    };
    session: {
        maxPerUser: number;
        staleRefreshTokenAfterHours: number;
    };
    localLogin: {
        email: {
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
        codeTTLMinutes: number;
    };
    commonFields: {
        email: FieldConfig;
        password: PasswordFieldConfig;
    };
    additionalFields: {
        registerEndpoint: {
            [key: string]: FieldConfig;
        };
    };
}
