import { Connection } from "typeorm";

export function mockConnection(): Connection {
    return {
        getRepository: jest.fn(),
    } as unknown as Connection;
}
