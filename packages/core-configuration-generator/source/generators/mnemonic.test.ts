import { describe } from "../../../core-test-framework/distribution";
import { MnemonicGenerator } from "./mnemonic";

describe<{
	generator: MnemonicGenerator;
}>("MnemonicGenerator", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.generator = new MnemonicGenerator();
	});

	it("#generate - should generate mnemonic", ({ generator }) => {
		assert.string(generator.generate());
	});

	it("#generateMany - should generate many mnemonic", ({ generator }) => {
		const mnemonics = generator.generateMany(3);

		assert.array(mnemonics);
		assert.equal(mnemonics.length, 3);
	});
});
