import { describe } from "../../../core-test-framework/distribution";
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
