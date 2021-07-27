import { base64ToHttpFriendly } from "../../src/utils/base64";

describe("base64ToHttpFriendly()", () => {
    it("should replace all characters", async () => {
        const result = base64ToHttpFriendly("a+1/b+c/");
        expect(result).toBe("a-1_b-c_");
    });
});
