import "jest-extended";

import { partition } from "./partition";

describe("#partition", () => {
    const users = [
        { user: "barney", age: 36, active: false },
        { user: "fred", age: 40, active: true },
        { user: "pebbles", age: 1, active: false },
    ];

    it("should work with a function", () => {
        expect(partition(users, ({ active }) => active)).toEqual([
            [{ user: "fred", age: 40, active: true }],
            [{ user: "barney", age: 36, active: false }, { user: "pebbles", age: 1, active: false }],
        ]);
    });
});
