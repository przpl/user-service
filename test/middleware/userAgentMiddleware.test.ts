import UserAgentMiddleware from "../../src/middleware/userAgentMiddleware";

describe("UserAgentMiddleware", () => {
    let logger: any;
    let sut: UserAgentMiddleware;

    beforeEach(() => {
        logger = {
            error: jest.fn(),
        };
        sut = new UserAgentMiddleware(logger);
    });

    describe("parse()", () => {
        it("should parse", () => {
            const request: any = {
                headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0" },
            };
            const next = jest.fn();

            sut.parse(request, null, next);

            expect(request.userAgent.browser.name).toBe("Firefox");
            expect(request.userAgent.browser.version).toBe("90.0");
            expect(request.userAgent.os.name).toBe("Windows");
            expect(request.userAgent.os.version).toBe("10");
            expect(next).toBeCalledTimes(1);
            expect(logger.error).not.toBeCalled();
        });

        it("should ignore null user agent", () => {
            const request: any = {
                headers: { "user-agent": null },
            };
            const next = jest.fn();

            sut.parse(request, null, next);

            expect(request.userAgent).toBeTruthy();
            expect(next).toBeCalledTimes(1);
            expect(logger.error).not.toBeCalled();
        });

        it("should ignore invalid user agent", () => {
            const request: any = {
                headers: { "user-agent": "_broken_" },
            };
            const next = jest.fn();

            sut.parse(request, null, next);

            expect(request.userAgent).toBeTruthy();
            expect(next).toBeCalledTimes(1);
            expect(logger.error).not.toBeCalled();
        });
    });
});
