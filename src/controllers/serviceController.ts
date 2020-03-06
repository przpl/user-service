import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import Config from "../utils/config";

export default class ServiceController {
    constructor(private _config: Config) {}

    public status(req: Request, res: Response, next: NextFunction) {
        if (this._config.administrationKey && this._config.administrationKey !== req.query.administrationKey) {
            return res.status(HttpStatus.UNAUTHORIZED).send();
        }

        const currentTime = new Date();
        const data = {
            serviceId: this._config.serviceId,
            environment: {
                isProduction: !this._config.isDev(),
                value: this._config.environment,
            },
            currentTime: {
                unixTimestamp: this.toUnixTimestamp(currentTime),
                utcString: currentTime.toUTCString(),
            },
            memoryUsage: this.formatMemoryUsage(process.memoryUsage()),
        };

        res.send(data);
    }

    // TODO do usunięcia, klucz JWT powinien być zduplikowany w konfigu, lepiej nie przesyłać go przez sieć, przy connect biblioteka może sprawdzać czy mają kompatybilne klucze
    public getConfig(req: Request, res: Response, next: NextFunction) {
        const response = {
            emailMaxLength: this._config.emailMaxLength,
            passwordMaxLength: this._config.passwordMaxLength,
            tokenTTLMinutes: this._config.tokenTTLMinutes,
        };

        res.json(response);
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

    private toUnixTimestamp(date: Date): number {
        return Math.round(+date / 1000);
    }
}
