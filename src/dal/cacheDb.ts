import redis from "redis";

enum KeyFlags {
    expireSeconds = "EX",
    expireMiliseconds = "PX",
    onlySetIfNotExist = "NX",
    onlySetIfExist = "XX",
}

export interface MfaLoginToken {
    token: string;
    ip: string;
}

export class CacheDb {
    private _client: redis.RedisClient;

    constructor(host = "127.0.0.1", port = 6379, dbIndex = 0) {
        this._client = redis.createClient({ host: host, port: port, db: dbIndex });
    }

    public setMfaLoginToken(userId: string, token: string, ip: string, expireTimeSeconds: number) {
        const tokenObj: MfaLoginToken = { token: token, ip: ip };
        return new Promise((resolve, reject) => {
            const keyName = this.getMfaLoginTokenKey(userId);
            this._client.SET(keyName, JSON.stringify(tokenObj), KeyFlags.expireSeconds, expireTimeSeconds, (err, reply) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(reply === "OK");
            });
        });
    }

    public getMfaLoginToken(userId: string): Promise<MfaLoginToken> {
        return new Promise((resolve, reject) => {
            const keyName = this.getMfaLoginTokenKey(userId);
            this._client.GET(keyName, (err, reply) => {
                if (err) {
                    reject(err);
                    return;
                }
                const token = JSON.parse(reply) as MfaLoginToken;
                resolve(token);
            });
        });
    }

    public removeMfaLoginToken(userId: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const keyName = this.getMfaLoginTokenKey(userId);
            this._client.del(keyName, (err, reply) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(reply);
            });
        });
    }

    private getMfaLoginTokenKey(userId: string): string {
        return `mlt:${userId}`;
    }
}
