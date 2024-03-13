import { Contracts } from "@mainsail/contracts";

import { describe, Sandbox } from "../../test-framework/source";
import { validatorKeys } from "../test/fixtures/validator-keys";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Validator } from "./validator";

describe<{
	sandbox: Sandbox;
	validator: Contracts.Validator.Validator;
}>("Validator", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		const { consensusKeyPair } = validatorKeys[0];
		context.validator = context.sandbox.app
			.resolve<Contracts.Validator.Validator>(Validator)
			.configure(consensusKeyPair);
	});

	it("#getConsensusPublicKey", async ({ validator }) => {
		assert.equal(validator.getConsensusPublicKey(), validatorKeys[0].consensusKeyPair.publicKey);
	});

	it("#prepareBlock - should prepare block", async ({ validator }) => {
		const block = await validator.prepareBlock("walletPublicKey", 1);
		assert.defined(block);
		assert.equal(block.data.height, 2);
	});

	it("#propose - should create signed proposal", async ({ validator }) => {
		const block = await validator.prepareBlock("walletPublicKey", 1);
		const proposal = await validator.propose(0, 1, undefined, block);
		assert.defined(proposal);
		assert.defined(proposal.signature);
	});

	it("#prevote - should create signed prevote", async ({ validator }) => {
		const block = await validator.prepareBlock("walletPublicKey", 1);
		const prevote = await validator.prevote(0, 1, 1, block.header.id);
		assert.defined(prevote);
		assert.defined(prevote.signature);
	});

	it("#precommit - should create signed precommit", async ({ validator }) => {
		const block = await validator.prepareBlock("walletPublicKey", 1);
		const precommit = await validator.precommit(0, 1, 1, block.header.id);
		assert.defined(precommit);
		assert.defined(precommit.signature);
	});
});
