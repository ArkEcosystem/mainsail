import { Contracts } from "@mainsail/contracts";

import { describe } from "../../test-framework/source";
import { FeeCalculator } from "./fee-calculator";

describe("FeeCalculator", ({ assert, it }) => {
	it("should calculate gas consumed", async () => {
		const feeCalculator = new FeeCalculator();

		assert.equal(feeCalculator.calculateConsumed(5 * 1e9, 21_000).toBigInt(), 105_000_000_000_000n);

		assert.equal(
			feeCalculator
				.calculate({ data: { gas: 21_000, gasPrice: 5 * 1e9 } } as Contracts.Crypto.Transaction)
				.toBigInt(),
			105_000_000_000_000n,
		);
	});
});
