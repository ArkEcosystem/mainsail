import { describe } from "../../../core-test-framework/distribution";
import { NetworkGenerator } from "./network";

describe<{
	dataPath: string;
	generator: NetworkGenerator;
}>("NetworkGenerator", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.generator = new NetworkGenerator();
	});

	it("#generate - should generate network", ({ generator }) => {
		assert.equal(
			generator.generate("nethash", {
				explorer: "http://myn.com",
				network: "testnet",
				pubKeyHash: 123,
				symbol: "my",
				token: "myn",
				wif: 44,
			}),
			{
				client: {
					explorer: "http://myn.com",
					symbol: "my",
					token: "myn",
				},
				messagePrefix: `testnet message:\n`,
				name: "testnet",
				nethash: "nethash",
				pubKeyHash: 123,
				slip44: 1,
				wif: 44,
			},
		);
	});
});
