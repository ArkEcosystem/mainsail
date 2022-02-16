import { orderBy } from "./order-by";

const dummies = [
    { name: "Andrew", age: 18 },
    { name: "Bob", age: 18 },
    { name: "John", age: 30 },
    { name: "Jane", age: 40 },
];

describe("#orderBy", () => {
    it("should sort records by youngest age (with string params)", () => {
        expect(orderBy([...dummies], "age", "asc")).toEqual([
            { name: "Andrew", age: 18 },
            { name: "Bob", age: 18 },
            { name: "John", age: 30 },
            { name: "Jane", age: 40 },
        ]);
    });

    it("should sort records by youngest age (with function params)", () => {
        expect(orderBy([...dummies], value => value.age, "asc")).toEqual([
            { name: "Andrew", age: 18 },
            { name: "Bob", age: 18 },
            { name: "John", age: 30 },
            { name: "Jane", age: 40 },
        ]);
    });

    it("should sort records by oldest age (with string params)", () => {
        expect(orderBy([...dummies], "age", "desc")).toEqual([
            { name: "Jane", age: 40 },
            { name: "John", age: 30 },
            { name: "Andrew", age: 18 },
            { name: "Bob", age: 18 },
        ]);
    });

    it("should sort records by oldest age (with function params)", () => {
        expect(orderBy([...dummies], value => value.age, "desc")).toEqual([
            { name: "Jane", age: 40 },
            { name: "John", age: 30 },
            { name: "Andrew", age: 18 },
            { name: "Bob", age: 18 },
        ]);
    });

    it("should sort records by youngest age (with array params)", () => {
        expect(orderBy([...dummies], ["name", "age"], ["asc", "asc"])).toEqual([
            { name: "Andrew", age: 18 },
            { name: "Bob", age: 18 },
            { name: "Jane", age: 40 },
            { name: "John", age: 30 },
        ]);
    });

    it("should sort records by oldest age (with array params)", () => {
        expect(orderBy([...dummies], ["name", "age"], ["asc", "desc"])).toEqual([
            { name: "Andrew", age: 18 },
            { name: "Bob", age: 18 },
            { name: "Jane", age: 40 },
            { name: "John", age: 30 },
        ]);
    });
});
