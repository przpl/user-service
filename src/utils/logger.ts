import winston from "winston";

const jsonFormatter = (logEntry: any) => {
    const MESSAGE = Symbol.for("message");
    const base = { timestamp: new Date() };
    const json = Object.assign(base, logEntry);
    logEntry[MESSAGE] = JSON.stringify(json);
    return logEntry;
};

export enum LoggerLevel {
    info = "info",
    warn = "warn",
    error = "error",
}

export default class Logger {
    private _logger: winston.Logger;

    constructor(disabled: boolean, level?: LoggerLevel, fileName = "./logfile.log") {
        if (disabled) {
            return;
        }

        this._logger = winston.createLogger({
            level: level || LoggerLevel.info,
            format: winston.format(jsonFormatter)(),
            transports: [
                new winston.transports.File({
                    filename: fileName,
                    maxsize: 262144000, // 250MB
                    maxFiles: 10,
                }),
            ],
            exitOnError: false,
        });
    }

    public info(message: string) {
        if (!this._logger) {
            return;
        }

        try {
            this._logger.log(LoggerLevel.info, message);
        } catch (error) {
            // ignored
        }
    }

    public warn(message: string) {
        if (!this._logger) {
            return;
        }

        try {
            this._logger.log(LoggerLevel.warn, message);
        } catch (error) {
            // ignored
        }
    }

    public error(message: string) {
        if (!this._logger) {
            return;
        }

        try {
            this._logger.log(LoggerLevel.error, message);
        } catch (error) {
            // ignored
        }
    }
}
