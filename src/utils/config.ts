import dotenv from "dotenv";

export default class Config {
    public load(envPath: string) {
        const result = dotenv.config({ path: envPath });
        if (result.error) {
            throw new Error(`Cannot load .env file: ${result.error}`);
        }
        process.env.NODE_ENV = process.env.NODE_ENV || "production";
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
}
