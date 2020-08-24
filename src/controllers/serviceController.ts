import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { singleton } from "tsyringe";
import moment from "moment";

import Env from "../utils/config/env";

@singleton()
export default class ServiceController {
    constructor(private _env: Env) {}

    public status(req: Request, res: Response, next: NextFunction) {
        if (this._env.administrationKey && this._env.administrationKey !== req.query.administrationKey) {
            return res.status(StatusCodes.FORBIDDEN).send();
        }

        const currentTime = moment();
        const data = {
            serviceId: this._env.serviceId,
            environment: {
                isProduction: !this._env.isDev(),
                value: this._env.environment,
            },
            currentTime: {
                unixTimestamp: currentTime.unix(),
                utcString: currentTime.toString(),
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
