import { sortBy } from "./sort-by";

const dummies = [
    { name: "John", age: 30 },
    { name: "Jane", age: 40 },
    { name: "Andrew", age: 18 },
    { name: "Bob", age: 18 },
];

describe("#sortBy", () => {
    it("should sort records without iteratees", () => {
        expect(sortBy([...dummies])).toEqual([
            { name: "John", age: 30 },
            { name: "Jane", age: 40 },
            { name: "Andrew", age: 18 },
            { name: "Bob", age: 18 },
        ]);
    });

    it("should sort records by string", () => {
        expect(sortBy([...dummies], "age")).toEqual([
            { name: "Andrew", age: 18 },
            { name: "Bob", age: 18 },
            { name: "John", age: 30 },
            { name: "Jane", age: 40 },
        ]);
    });

    it("should sort records by array", () => {
        expect(sortBy([...dummies], ["age"])).toEqual([
            { name: "Andrew", age: 18 },
            { name: "Bob", age: 18 },
            { name: "John", age: 30 },
            { name: "Jane", age: 40 },
        ]);
    });
});
