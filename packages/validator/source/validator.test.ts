import type { Contracts } from "@mainsail/contracts";
import { Enums, Identifiers } from "@mainsail/constants";

import { describe } from "@mainsail/test-runner";
import { validatorKeys } from "../test/fixtures/validator-keys";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { BIP39 } from "./keys/bip39";
import { Validator } from "./validator";
import { Application } from "@mainsail/kernel";

describe<{
	app: Application;
	validator: Contracts.Validator.Validator;
	generatorAddress: string;
	forger: Contracts.Forger.BlockForger;
}>("Validator", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.forger = context.app.get<Contracts.Forger.BlockForger>(Identifiers.Forger.Block);

		const { consensusKeyPair, mnemonic } = validatorKeys[0];
		context.validator = context.app
			.resolve<Contracts.Validator.Validator>(Validator)
			.configure(await new BIP39().configure(consensusKeyPair));

		context.generatorAddress = await context.app
			.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
			.fromMnemonic(mnemonic);
	});

	it("#getConsensusPublicKey", async ({ validator }) => {
		assert.equal(validator.getConsensusPublicKey(), validatorKeys[0].consensusKeyPair.publicKey);
	});

	it("#propose - should create a signed proposal carrying the given round and validator index", async ({
		validator,
		generatorAddress,
		forger,
	}) => {
		const block = await forger.forgeBlock(generatorAddress, 1, 0);
		const proposal = await validator.propose(0, 2, undefined, block);

		assert.defined(proposal.signature);
		assert.equal(proposal.round, 2);
		assert.equal(proposal.validatorIndex, 0);
		assert.undefined(proposal.validRound);
	});

	it("#propose - should carry the valid round when locked on a previous round", async ({
		validator,
		generatorAddress,
		forger,
	}) => {
		const block = await forger.forgeBlock(generatorAddress, 1, 0);
		const proposal = await validator.propose(0, 3, 1, block);

		assert.equal(proposal.round, 3);
		assert.equal(proposal.validRound, 1);
	});

	it("#propose - should embed the lock proof when proposing a locked value", async ({
		validator,
		generatorAddress,
		forger,
	}) => {
		const block = await forger.forgeBlock(generatorAddress, 1, 0);
		const lockProof: Contracts.Crypto.AggregatedSignature = {
			// 96-byte (192 hex) placeholder signature; validators must match roundValidators (53).
			signature: "a".repeat(192),
			validators: Array.from({ length: 53 }, () => true),
		};

		const proposal = await validator.propose(0, 3, 1, block, lockProof);

		assert.defined(proposal.lockProof);
		assert.equal(proposal.lockProof?.signature, lockProof.signature);
	});

	it("#prevote - should create a signed prevote for the given block", async ({
		validator,
		generatorAddress,
		forger,
	}) => {
		const block = await forger.forgeBlock(generatorAddress, 1, 0);
		const prevote = await validator.prevote(0, 1, 2, block.hash);

		assert.defined(prevote.signature);
		assert.equal(prevote.type, Enums.Crypto.MessageType.Prevote);
		assert.equal(prevote.validatorIndex, 0);
		assert.equal(prevote.blockNumber, 1);
		assert.equal(prevote.round, 2);
		assert.equal(prevote.blockHash, block.hash);
	});

	it("#prevote - should create a signed prevote for nil (no block)", async ({ validator }) => {
		const prevote = await validator.prevote(0, 1, 2, undefined);

		assert.defined(prevote.signature);
		assert.equal(prevote.type, Enums.Crypto.MessageType.Prevote);
		assert.undefined(prevote.blockHash);
	});

	it("#precommit - should create a signed precommit for the given block", async ({
		validator,
		generatorAddress,
		forger,
	}) => {
		const block = await forger.forgeBlock(generatorAddress, 1, 0);
		const precommit = await validator.precommit(0, 1, 2, block.hash);

		assert.defined(precommit.signature);
		assert.equal(precommit.type, Enums.Crypto.MessageType.Precommit);
		assert.equal(precommit.validatorIndex, 0);
		assert.equal(precommit.blockNumber, 1);
		assert.equal(precommit.round, 2);
		assert.equal(precommit.blockHash, block.hash);
	});

	it("#precommit - should create a signed precommit for nil (no block)", async ({ validator }) => {
		const precommit = await validator.precommit(0, 1, 2, undefined);

		assert.defined(precommit.signature);
		assert.equal(precommit.type, Enums.Crypto.MessageType.Precommit);
		assert.undefined(precommit.blockHash);
	});
});
