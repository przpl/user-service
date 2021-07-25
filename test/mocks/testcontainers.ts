import redis from "redis";
import { GenericContainer, PostgreSqlContainer, StartedPostgreSqlContainer, StartedTestContainer } from "testcontainers";
import { Connection, createConnection } from "typeorm";

export class TestContainer {
    private _postgresContainer: StartedPostgreSqlContainer;
    private _postgresConnection: Connection;
    private _redisContainer: StartedTestContainer;
    private _redisClient: redis.RedisClient;

    public async getTypeOrmConnection(): Promise<Connection> {
        if (this.isPostgresActive()) {
            throw new Error("PostgreSQL container is already running.");
        }

        this._postgresContainer = await new PostgreSqlContainer("postgres:13.3-alpine3.14").start();
        this._postgresConnection = await createConnection({
            type: "postgres",
            host: this._postgresContainer.getHost(),
            port: this._postgresContainer.getPort(),
            username: this._postgresContainer.getUsername(),
            password: this._postgresContainer.getPassword(),
            database: this._postgresContainer.getDatabase(),
            entities: ["src/dal/entities/**/**.ts"],
            synchronize: true,
        });
        return this._postgresConnection;
    }

    public async getRedisClient(): Promise<redis.RedisClient> {
        if (this.isRedisActive()) {
            throw new Error("Redis container is already running.");
        }

        this._redisContainer = await new GenericContainer("redis:6.2.4-alpine3.14").withExposedPorts(6379).start();
        this._redisClient = redis.createClient(this._redisContainer.getMappedPort(6379), this._redisContainer.getHost());
        return this._redisClient;
    }

    public async cleanup() {
        if (this.isPostgresActive()) {
            await this._postgresConnection.close();
            await this._postgresContainer.stop();
        }

        if (this.isRedisActive()) {
            await new Promise((resolve, reject) => {
                this._redisClient.quit((err, reply) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(reply === "OK");
                });
            });
            await this._redisContainer.stop();
        }
    }

    private isPostgresActive(): boolean {
        return Boolean(this._postgresContainer || this._postgresConnection);
    }

    private isRedisActive(): boolean {
        return Boolean(this._redisContainer || this._redisClient);
    }
}
