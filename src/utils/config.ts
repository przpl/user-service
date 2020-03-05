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
}
