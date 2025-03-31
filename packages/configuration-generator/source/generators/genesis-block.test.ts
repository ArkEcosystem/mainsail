import { Contracts, Identifiers as AppIdentifiers } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";

import { describe } from "../../../test-framework/source";
import { makeApplication } from "../application-factory";
import { Identifiers } from "../identifiers";
import { GenesisBlockGenerator } from "./genesis-block";
import { MnemonicGenerator } from "./mnemonic";

describe<{
	app: Application;
	generator: GenesisBlockGenerator;
	mnemonicGenerator: MnemonicGenerator;
}>("GenesisBlockGenerator", ({ it, assert, afterEach, beforeEach }) => {
	afterEach(async (context) => {
		for (const tag of ["evm", "validator", "transaction-pool", "rpc"]) {
			await context.app.getTagged<Contracts.Evm.Instance>(AppIdentifiers.Evm.Instance, "instance", tag).dispose();
		}
	});

	beforeEach(async (context) => {
		const app = await makeApplication();

		context.app = app;

		// @ts-ignore
		app.get<Contracts.Crypto.Configuration>(AppIdentifiers.Cryptography.Configuration).setConfig({
			genesisBlock: {
				block: {
					height: 0,
				},
			},
			milestones: [
				{
					address: { bech32m: "ark" },
					block: { maxGasLimit: 30_000_000, maxPayload: 2_097_152, maxTransactions: 150, version: 1 },
					blockTime: 8000,
					evmSpec: Contracts.Evm.SpecId.SHANGHAI,
					// @ts-ignore
					gas: {
						maximumGasLimit: 2_000_000,
						maximumGasPrice: 10_000 * 1e9,
						minimumGasLimit: 21_000,
						minimumGasPrice: 5 * 1e9,
					},

					height: 0,

					reward: "0",
				},
			],
		});

		context.generator = app.get<GenesisBlockGenerator>(Identifiers.Generator.GenesisBlock);
		context.mnemonicGenerator = app.get<MnemonicGenerator>(Identifiers.Generator.Mnemonic);
	});

	it("#generate - should return generated data", async ({ generator, mnemonicGenerator }) => {
		const validatorsCount = 10;
		assert.object(
			await generator.generate(mnemonicGenerator.generate(), mnemonicGenerator.generateMany(validatorsCount), {
				chainId: 123,
				distribute: true,
				epoch: new Date(),
				initialHeight: 0,
				premine: "2000000000",
				validators: 53,
			} as Contracts.NetworkGenerator.InternalOptions),
		);
	});
});
