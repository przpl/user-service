import XsrfMiddleware from "../../src/middleware/xsrfMiddleware";
import { Xsrf } from "../../src/services/xsrf";
import { mockEnv } from "../mocks/mockEnv";

describe("XsrfMiddleware", () => {
    let logger: any;
    let sut: XsrfMiddleware;

    beforeEach(() => {
        logger = {
            error: jest.fn(),
        };
        sut = new XsrfMiddleware(logger, new Xsrf(mockEnv()));
    });

    describe("validate()", () => {
        it("should throw error if session is missing", () => {
            const request: any = {};
            const next = jest.fn();

            expect(() => sut.validate(request, null, next)).toThrowError();
        });

        it("should forward missingXSRFToken error if token is missing", () => {
            const request: any = {
                sessionId: "123",
                headers: {},
            };
            const next = jest.fn();

            sut.validate(request, null, next);

            expect(next).toBeCalledTimes(1);
            expect(next).toBeCalledWith({
                originalError: undefined,
                responseErrorsList: [{ id: "missingXSRFToken" }],
                responseStatusCode: 401,
            });
            expect(next).not.toBeCalledWith();
        });

        it("should forward invalidXSRFToken error if token is invalid", () => {
            const request: any = {
                sessionId: "123",
                headers: { "x-xsrf-token": "123" },
            };
            const next = jest.fn();

            sut.validate(request, null, next);

            expect(next).toBeCalledTimes(1);
            expect(next).toBeCalledWith({
                originalError: undefined,
                responseErrorsList: [{ id: "invalidXSRFToken" }],
                responseStatusCode: 401,
            });
            expect(next).not.toBeCalledWith();
        });

        it("should validate if token is valid", () => {
            const request: any = {
                sessionId: "123",
                headers: { "x-xsrf-token": "DNMuG/mXu7qVZzH6WhfadcMOiq4L4O7nEwKrCcfVSxI=" },
            };
            const next = jest.fn();

            sut.validate(request, null, next);

            expect(next).toBeCalledTimes(1);
        });
    });
});
