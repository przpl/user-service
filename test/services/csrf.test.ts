import { Xsrf } from "../../src/services/xsrf";
import { mockEnv } from "../mocks/mockEnv";

const env = mockEnv();
const sut = new Xsrf(env);

describe("generate()", () => {
    it("should generate token", () => {
        expect(sut.generate("1")).toBe("eQ2GUOf5gwX2DLpiPd9xd4PGxNi5TckWbGQijElOsoc=");
        expect(sut.generate("2")).toBe("hkXP/a0uUkaRWNakkk3N7DP6OpPUw0DWu2nHFeBRGdM=");
    });
});

describe("validate()", () => {
    it("should validate token", () => {
        expect(sut.validate("eQ2GUOf5gwX2DLpiPd9xd4PGxNi5TckWbGQijElOsoc=", "1")).toBe(true);
        expect(sut.validate("hkXP/a0uUkaRWNakkk3N7DP6OpPUw0DWu2nHFeBRGdM=", "2")).toBe(true);
        expect(sut.validate("hkXP/a0uUkaRWNakkk3N7DP6OpPUw0DWu2nHFeBRGdM=", "3")).toBe(false);
    });
});
