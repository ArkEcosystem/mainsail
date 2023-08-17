import { Contracts } from "@mainsail/contracts";
import { describe } from "../../../test-framework";
import { isMinority } from "./is-minority";

describe("isMinority", ({ assert, it }) => {
	const makeMilestones = (activeValidators: number) =>
		({ getMilestone: () => ({ activeValidators }) } as Contracts.Crypto.IConfiguration);

	it("should be true", () => {
		for (let i = 53 / 3 + 1; i <= 53; i++) {
			assert.true(isMinority(i, makeMilestones(53)));
		}

		assert.true(isMinority(4, makeMilestones(9)));
	});

	it("should be false", () => {
		for (let i = 0; i < 53 / 3 + 1; i++) {
			assert.false(isMinority(i, makeMilestones(53)));
		}

		assert.false(isMinority(0, makeMilestones(0)));
	});
});
