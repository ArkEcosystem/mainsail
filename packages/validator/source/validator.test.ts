import { Contracts } from "@mainsail/contracts";

import { describe, Sandbox } from "../../test-framework";
import { validatorKeys } from "../test/fixtures/validator-keys";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Validator } from "./validator";

describe<{
	sandbox: Sandbox;
	validator: Contracts.Consensus.IValidator;
}>("Validator", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		const { consensusKeyPair, walletPublicKey } = validatorKeys[0];
		context.validator = context.sandbox.app
			.resolve<Contracts.Consensus.IValidator>(Validator)
			.configure(walletPublicKey, consensusKeyPair, 0);
	});

	it("#getConsensusPublicKey", async ({ validator }) => {
		assert.equal(validator.getConsensusPublicKey(), validatorKeys[0].consensusKeyPair.publicKey);
	});

	it("#prepareBlock - should prepare block", async ({ validator }) => {
		const block = await validator.prepareBlock(1, 1);
		assert.defined(block);
		assert.equal(block.data.height, 2);
	});

	it("#propose - should create signed proposal", async ({ validator }) => {
		const block = await validator.prepareBlock(1, 1);
		const proposal = await validator.propose(1, 1, block, undefined);
		assert.defined(proposal);
		assert.defined(proposal.signature);
	});

	it("#prevote - should create signed prevote", async ({ validator }) => {
		const block = await validator.prepareBlock(1, 1);
		const prevote = await validator.prevote(1, 1, block.header.id);
		assert.defined(prevote);
		assert.defined(prevote.signature);
	});

	it("#precommit - should create signed precommit", async ({ validator }) => {
		const block = await validator.prepareBlock(1, 1);
		const precommit = await validator.precommit(1, 1, block.header.id);
		assert.defined(precommit);
		assert.defined(precommit.signature);
	});
});
