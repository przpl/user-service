import moment from "moment";

import { Expirable } from "../../src/models/expirable";
import nameof from "../../src/utils/nameof";
import { TimeSpan } from "../../src/utils/timeSpan";

class Sut extends Expirable {
    constructor(public date: Date) {
        super(nameof<Sut>("date"));
    }
}

describe("Expirable", () => {
    describe("isExpired()", () => {
        it("should return true if is expired", () => {
            const date = moment().subtract(31, "seconds").toDate();
            const sut = new Sut(date);

            expect(sut.isExpired(TimeSpan.fromSeconds(30))).toBe(true);
        });

        it("should return false if is not expired", () => {
            const date = moment().subtract(25, "seconds").toDate();
            const sut = new Sut(date);

            expect(sut.isExpired(TimeSpan.fromSeconds(30))).toBe(false);
        });
    });
});
