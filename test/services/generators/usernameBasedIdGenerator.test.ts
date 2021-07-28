import { UsernameBasedIdGenerator } from "../../../src/services/generators/usernameBasedIdGenerator";
import { mockConfig } from "../../mocks/mockConfig";

describe("UsernameBasedIdGenerator", () => {
    const sut = new UsernameBasedIdGenerator(mockConfig());

    describe("generate()", () => {
        it("should generate id", async () => {
            const result = await sut.generate("username1");

            expect(result).toBe("mZ18gJzL8tG1/4");
        });
    });
});
