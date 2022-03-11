import { describe } from "../../../core-test-framework";
import { Flags } from "./flags";

describe("castFlagsToString", ({ it, assert }) => {
	it("should handle strings", () => {
		assert.equal(
			Flags.castFlagsToString({
				key: "value",
			}),
			"--key='value'",
		);
	});

	it("should handle strings with spaces", () => {
		assert.equal(
			Flags.castFlagsToString({
				key: "hello world",
			}),
			"--key='hello world'",
		);
	});

	it("should handle integers", () => {
		assert.equal(
			Flags.castFlagsToString({
				key: 1,
			}),
			"--key=1",
		);
	});

	it("should handle booleans", () => {
		assert.equal(
			Flags.castFlagsToString({
				key: true,
			}),
			"--key",
		);
	});

	it("should ignore keys", () => {
		assert.equal(
			Flags.castFlagsToString(
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
