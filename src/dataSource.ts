import { DataSource } from "typeorm";

import configJson from "../config.json";

export const dataSource = new DataSource({
    type: "postgres",
    host: configJson.dataSource.host,
    port: configJson.dataSource.port,
    username: configJson.dataSource.username,
    password: configJson.dataSource.password,
    database: configJson.dataSource.database,
    entities: ["src/dal/entities/**/**.ts"],
    migrations: ["src/dal/migrations/*.ts"],
});
