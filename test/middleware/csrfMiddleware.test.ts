import CsrfMiddleware from "../../src/middleware/csrfMiddleware";
import { Csrf } from "../../src/services/csrf";
import { mockEnv } from "../mocks/mockEnv";

describe("CsrfMiddleware", () => {
    let logger: any;
    let sut: CsrfMiddleware;

    beforeEach(() => {
        logger = {
            error: jest.fn(),
        };
        sut = new CsrfMiddleware(logger, new Csrf(mockEnv()));
    });

    describe("validate()", () => {
        it("should throw error if session is missing", () => {
            const request: any = {};
            const next = jest.fn();

            expect(() => sut.validate(request, null, next)).toThrowError();
        });

        it("should forward missingCSRFToken error if token is missing", () => {
            const request: any = {
                sessionId: "123",
                headers: {},
            };
            const next = jest.fn();

            sut.validate(request, null, next);

            expect(next).toBeCalledTimes(1);
            expect(next).toBeCalledWith({
                originalError: undefined,
                responseErrorsList: [{ id: "missingCSRFToken" }],
                responseStatusCode: 401,
            });
            expect(next).not.toBeCalledWith();
        });

        it("should forward invalidCSRFToken error if token is invalid", () => {
            const request: any = {
                sessionId: "123",
                headers: { "x-csrf-token": "123" },
            };
            const next = jest.fn();

            sut.validate(request, null, next);

            expect(next).toBeCalledTimes(1);
            expect(next).toBeCalledWith({
                originalError: undefined,
                responseErrorsList: [{ id: "invalidCSRFToken" }],
                responseStatusCode: 401,
            });
            expect(next).not.toBeCalledWith();
        });

        it("should validate if token is valid", () => {
            const request: any = {
                sessionId: "123",
                headers: { "x-csrf-token": "DNMuG/mXu7qVZzH6WhfadcMOiq4L4O7nEwKrCcfVSxI=" },
            };
            const next = jest.fn();

            sut.validate(request, null, next);

            expect(next).toBeCalledTimes(1);
        });
    });
});
