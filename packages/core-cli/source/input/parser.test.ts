import { describe } from "../../../core-test-framework";
import { InputParser } from "./parser";

describe("InputParser", ({ it, assert }) => {
	it("should parse the arguments and flags", () => {
		const { args, flags } = InputParser.parseArgv(["env:set", "john", "doe", "--force"]);

		assert.equal(args, ["env:set", "john", "doe"]);
		assert.true(flags.force);
	});
});
