import { UsernameBasedIdGenerator } from "../../../src/services/generators/usernameBasedIdGenerator";
import { mockConfig } from "../../mocks/mockConfig";

describe("UsernameBasedIdGenerator", () => {
    const sut = new UsernameBasedIdGenerator(mockConfig());

    describe("generate()", () => {
        it("should generate id", () => {
            expect(sut.generate("username1")).toBe("mZ18gJzL8tG1/4");
        });
    });
});
