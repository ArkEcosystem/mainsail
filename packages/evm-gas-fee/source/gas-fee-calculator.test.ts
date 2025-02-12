import { Contracts } from "@mainsail/contracts";
import { describe } from "../../test-framework/source";
import { GasFeeCalculator } from "./gas-fee-calculator";

describe("GasFeeCalculator", ({ assert, it }) => {
	it("should calculate gas consumed", async () => {
		const calculator = new GasFeeCalculator();

		assert.equal(calculator.calculateConsumed(5 * 1e9, 21000).toBigInt(), 105000000000000n);

		assert.equal(
			calculator
				.calculate({ data: { gasPrice: 5 * 1e9, gasLimit: 21000 } } as Contracts.Crypto.Transaction)
				.toBigInt(),
			105000000000000n,
		);
	});
});
