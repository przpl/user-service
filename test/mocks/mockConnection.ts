import { DataSource } from "typeorm";

export function mockDataSource(): DataSource {
    return {
        getRepository: jest.fn(),
    } as unknown as DataSource;
}
