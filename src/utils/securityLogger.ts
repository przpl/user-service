import Logger, { LoggerLevel } from "./logger";

export default class SecurityLogger extends Logger {
    constructor(disabled: boolean, level?: LoggerLevel) {
        super(disabled, level, "./ip-logs.log");
    }
}
