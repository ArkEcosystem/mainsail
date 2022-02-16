import "jest-extended";

import { reject } from "./reject";

describe("#reject", () => {
    const users = [{ user: "barney", age: 36, active: false }, { user: "fred", age: 40, active: true }];

    it("should work with a function", () => {
        expect(reject(users, o => !o.active)).toEqual([{ user: "fred", age: 40, active: true }]);
    });
});
