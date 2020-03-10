import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import Config from "../utils/config/config";
import { toUnixTimestamp } from "../utils/timeUtils";

export default class ServiceController {
    constructor(private _config: Config) {}

    public status(req: Request, res: Response, next: NextFunction) {
        if (this._config.administrationKey && this._config.administrationKey !== req.query.administrationKey) {
            return res.status(HttpStatus.FORBIDDEN).send();
        }

        const currentTime = new Date();
        const data = {
            serviceId: this._config.serviceId,
            environment: {
                isProduction: !this._config.isDev(),
                value: this._config.environment,
            },
            currentTime: {
                unixTimestamp: toUnixTimestamp(currentTime),
                utcString: currentTime.toUTCString(),
            },
            memoryUsage: this.formatMemoryUsage(process.memoryUsage()),
        };

        res.send(data);
    }

    private formatMemoryUsage(usage: NodeJS.MemoryUsage) {
        return {
            rss: this.bytesToMb(usage.rss),
            heapTotal: this.bytesToMb(usage.heapTotal),
            heapUsed: this.bytesToMb(usage.heapUsed),
            external: this.bytesToMb(usage.external),
        };
    }

    private bytesToMb(bytes: number): string {
        return (bytes / 1_000_000).toFixed(2) + " MB";
    }
}
