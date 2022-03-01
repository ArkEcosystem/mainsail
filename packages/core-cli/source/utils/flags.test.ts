import { describe } from "../../../core-test-framework";
import { castFlagsToString } from "./flags";

describe("castFlagsToString", ({ it, assert }) => {
	it("should handle strings", () => {
		assert.equal(
			castFlagsToString({
				key: "value",
			}),
			"--key='value'",
		);
	});

	it("should handle strings with spaces", () => {
		assert.equal(
			castFlagsToString({
				key: "hello world",
			}),
			"--key='hello world'",
		);
	});

	it("should handle integers", () => {
		assert.equal(
			castFlagsToString({
				key: 1,
			}),
			"--key=1",
		);
	});

	it("should handle booleans", () => {
		assert.equal(
			castFlagsToString({
				key: true,
			}),
			"--key",
		);
	});

	it("should ignore keys", () => {
		assert.equal(
			castFlagsToString(
				{
					ignore: "value",
					key: "value",
				},
				["ignore"],
			),
			"--key='value'",
		);
	});
});
