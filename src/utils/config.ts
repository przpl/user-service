import dotenv from "dotenv";

export interface ConfigValidationResult {
    variableName: string;
    message: string;
    severity: "warning" | "error";
}

export default class Config {
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

    public get serviceId(): string {
        return process.env.SERVICE_ID || "UnknownUserService";
    }

    public get environment(): string {
        return process.env.NODE_ENV;
    }

    public isDev(): boolean {
        return process.env.NODE_ENV === "development";
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

    public get emailMaxLength(): number {
        return Number(process.env.EMAIL_MAX_LENGHT || 60);
    }

    public get passwordMaxLength(): number {
        return Number(process.env.PASSWORD_MAX_LENGHT || 128);
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
