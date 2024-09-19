import { Contracts, Identifiers as AppIdentifiers } from "@mainsail/contracts";

import { describe } from "../../../test-framework/source";
import { makeApplication } from "../application-factory";
import { Identifiers } from "../identifiers";
import { GenesisBlockGenerator } from "./genesis-block";
import { MnemonicGenerator } from "./mnemonic";

describe<{
	generator: GenesisBlockGenerator;
	mnemonicGenerator: MnemonicGenerator;
}>("GenesisBlockGenerator", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		const app = await makeApplication();

		// @ts-ignore
		app.get<Contracts.Crypto.Configuration>(AppIdentifiers.Cryptography.Configuration).setConfig({
			milestones: [
				{
					reward: "0",
					address: { bech32m: "ark" },
					block: { version: 1, maxPayload: 2097152, maxTransactions: 150 },
					blockTime: 8000,
					height: 0,
					// @ts-ignore
					gas: {
						maximumGasLimit: 2000000,
						minimumGasFee: 5,
						minimumGasLimit: 21000,
						nativeGasLimits: {
							transfer: 21000,
							multiPayment: 50000,
							multiSignature: 50000,
							usernameRegistration: 100000,
							usernameResignation: 50000,
							validatorRegistration: 100000,
							validatorResignation: 50000,
							vote: 50000,
						},
					},
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
				distribute: true,
				epoch: new Date(),
				premine: "2000000000",
				pubKeyHash: 123,
			}),
		);
	});
});
