import { describe } from "../../../test-framework/source";
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
			generator.generate({
				chainId: 1,
				explorer: "http://myn.com",
				network: "devnet",
				pubKeyHash: 123,
				symbol: "my",
				token: "myn",
				wif: 44,
			}),
			{
				chainId: 1,
				client: {
					explorer: "http://myn.com",
					symbol: "my",
					token: "myn",
				},
				name: "devnet",
				nethash: "5af6dc1dd8714713cf69dd13fbb4ffb1fc1836cb009682303248cbfede600d39",
				pubKeyHash: 123,
				slip44: 1,
				wif: 44,
			},
		);
	});

	it("#generate - should generate network with nethashSalt", ({ generator }) => {
		assert.equal(
			generator.generate({
				chainId: 1,
				explorer: "http://myn.com",
				network: "devnet",
				pubKeyHash: 123,
				symbol: "my",
				token: "myn",
				wif: 44,
				nethashSalt: 1,
			}),
			{
				chainId: 1,
				client: {
					explorer: "http://myn.com",
					symbol: "my",
					token: "myn",
				},
				name: "devnet",
				nethash: "03e8eabf43d7fcee4ecd7c73d41be913ea0f8b582edfd8383570eb7e504df863",
				pubKeyHash: 123,
				slip44: 1,
				wif: 44,
			},
		);
	});
});
