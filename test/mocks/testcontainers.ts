import { createClient } from "redis";
import { GenericContainer, PostgreSqlContainer, StartedPostgreSqlContainer, StartedTestContainer } from "testcontainers";
import { DataSource } from "typeorm";

import { RedisClient } from "../../src/types/redisClient";

export class TestContainer {
    private _postgresContainer: StartedPostgreSqlContainer | null;
    private _postgresConnection: DataSource | null;
    private _redisContainer: StartedTestContainer | null;
    private _redisClient: RedisClient | null;

    public async getTypeOrmConnection(showConnectionDetails = false): Promise<DataSource> {
        if (this.isPostgresActive()) {
            throw new Error("PostgreSQL container is already running.");
        }

        this._postgresContainer = await new PostgreSqlContainer("postgres:14.6-alpine3.17")
            .withEnvironment({
                TZ: "Europe/Warsaw", // fix problem with clock skew in Linux container running on top of Windows // TODO won't work in different timezones
            })
            .withUsername("test")
            .withPassword("test")
            .withDatabase("test")
            .start();
        const connectionData = {
            username: this._postgresContainer.getUsername(),
            password: this._postgresContainer.getPassword(),
            database: this._postgresContainer.getDatabase(),
        };
        this._postgresConnection = new DataSource({
            type: "postgres",
            host: this._postgresContainer.getHost(),
            port: this._postgresContainer.getPort(),
            ...connectionData,
            entities: ["src/dal/entities/**/**.ts"],
            synchronize: true,
        });
        await this._postgresConnection.initialize();
        if (showConnectionDetails) {
            // eslint-disable-next-line no-console
            console.log("Postgres connection details", {
                host: this._postgresContainer.getHost(),
                port: this._postgresContainer.getPort(),
                ...connectionData,
            });
        }
        return this._postgresConnection;
    }

    public async getRedisClient(): Promise<RedisClient> {
        if (this.isRedisActive()) {
            throw new Error("Redis container is already running.");
        }

        this._redisContainer = await new GenericContainer("redis:6.2.6-alpine3.15").withExposedPorts(6379).start();
        this._redisClient = createClient({
            socket: { host: this._redisContainer.getHost(), port: this._redisContainer.getMappedPort(6379) },
        });
        await this._redisClient.connect();
        return this._redisClient;
    }

    public async cleanup() {
        if (this.isPostgresActive()) {
            await this._postgresConnection!.destroy();
            await this._postgresContainer!.stop();
            this._postgresConnection = null;
            this._postgresContainer = null;
        }

        if (this.isRedisActive()) {
            await this._redisClient!.quit();
            await this._redisContainer!.stop();
            this._redisClient = null;
            this._redisContainer = null;
        }
    }

    private isPostgresActive(): boolean {
        return Boolean(this._postgresContainer || this._postgresConnection);
    }

    private isRedisActive(): boolean {
        return Boolean(this._redisContainer || this._redisClient);
    }
}
