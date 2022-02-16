import { find } from "./find";

const users = [
    { user: "barney", age: 36, active: true },
    { user: "fred", age: 40, active: false },
    { user: "pebbles", age: 1, active: true },
];

describe("#find", () => {
    it("should work with a function", () => {
        expect(find(users, o => o.age < 40)).toEqual(users[0]);

        expect(find(users, o => o.name === "john")).toBeUndefined();
    });
});
