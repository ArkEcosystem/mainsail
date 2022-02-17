import { hex } from "./hex";

describe("#hex", () => {
	it("should encode the given string", () => {
		expect(hex.encode("Hello World")).toBe("48656c6c6f20576f726c64");
	});

	it("should decode the given string", () => {
		expect(hex.decode("48656c6c6f20576f726c64")).toBe("Hello World");
	});
});
