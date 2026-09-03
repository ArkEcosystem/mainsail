import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { validatorKeys } from "../test/fixtures/validator-keys";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { BIP39 } from "./keys/bip39";
import { Validator } from "./validator";

const consensusPublicKey = validatorKeys[0].consensusKeyPair.publicKey;

// Mirrors the state store stub in prepareSandbox.
const GENESIS_BLOCK_HASH = "0000000000000000000000000000000000000000000000000000000000000001";
const PREVIOUS_BLOCK_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

describe<{
	app: Application;
	validator: Contracts.Validator.Validator;
	generatorAddress: string;
	forger: Contracts.Forger.BlockForger;
	doubleSignGuard: Contracts.Validator.DoubleSignGuard;
	messageFactory: Contracts.Crypto.MessageFactory;
}>("Validator", ({ it, assert, beforeEach, spy }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.forger = context.app.get<Contracts.Forger.BlockForger>(Identifiers.Forger.Block);
		context.messageFactory = context.app.get<Contracts.Crypto.MessageFactory>(
			Identifiers.Cryptography.Message.Factory,
		);

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

	it("#getRandaoReveal - should be deterministic for the same block number", async ({ validator }) => {
		const revealA = await validator.getRandaoReveal(2);
		const revealB = await validator.getRandaoReveal(2);
		const revealOther = await validator.getRandaoReveal(3);

		assert.equal(revealA.length, 192);
		assert.equal(revealA, revealB);
		assert.true(revealA !== revealOther);
	});

	it("#propose - should create a signed proposal carrying the given round and validator index", async ({
		validator,
		generatorAddress,
		forger,
	}) => {
		const block = await forger.forgeBlock(generatorAddress, 1, 0, await validator.getRandaoReveal(2));
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
		const block = await forger.forgeBlock(generatorAddress, 1, 0, await validator.getRandaoReveal(2));
		const proposal = await validator.propose(0, 3, 1, block);

		assert.equal(proposal.round, 3);
		assert.equal(proposal.validRound, 1);
	});

	it("#propose - should embed the lock proof when proposing a locked value", async ({
		validator,
		generatorAddress,
		forger,
	}) => {
		const block = await forger.forgeBlock(generatorAddress, 1, 0, await validator.getRandaoReveal(2));
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
		const block = await forger.forgeBlock(generatorAddress, 1, 0, await validator.getRandaoReveal(2));
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
		const block = await forger.forgeBlock(generatorAddress, 1, 0, await validator.getRandaoReveal(2));
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

	it("#configure - should return the validator for chaining", async ({ app }) => {
		const validator = app.resolve<Contracts.Validator.Validator>(Validator);
		const keyPair = await new BIP39().configure(validatorKeys[0].consensusKeyPair);

		assert.equal(validator.configure(keyPair), validator);
	});

	it("#propose - should guard the proposed position before signing", async ({
		validator,
		generatorAddress,
		forger,
		doubleSignGuard,
	}) => {
		const block = await forger.forgeBlock(generatorAddress, 1, 0, await validator.getRandaoReveal(2));
		const guard = spy(doubleSignGuard, "guard");

		await validator.propose(0, 2, undefined, block);

		guard.calledOnce();
		guard.calledWith(consensusPublicKey, {
			blockNumber: block.number,
			round: 2,
			step: Enums.Consensus.Step.Propose,
			value: block.hash,
		});
	});

	it("#propose - should not produce a proposal when the guard rejects", async ({
		validator,
		generatorAddress,
		forger,
		doubleSignGuard,
	}) => {
		const block = await forger.forgeBlock(generatorAddress, 1, 0, await validator.getRandaoReveal(2));
		doubleSignGuard.guard = async () => {
			throw new Error("double sign");
		};

		await assert.rejects(() => validator.propose(0, 2, undefined, block), "double sign");
	});

	it("#prevote - should guard the prevote position before signing", async ({
		validator,
		generatorAddress,
		forger,
		doubleSignGuard,
	}) => {
		const block = await forger.forgeBlock(generatorAddress, 1, 0, await validator.getRandaoReveal(2));
		const guard = spy(doubleSignGuard, "guard");

		await validator.prevote(0, 1, 2, block.hash);

		guard.calledOnce();
		guard.calledWith(consensusPublicKey, {
			blockNumber: 1,
			round: 2,
			step: Enums.Consensus.Step.Prevote,
			value: block.hash,
		});
	});

	it("#prevote - should guard a nil vote with no value", async ({ validator, doubleSignGuard }) => {
		const guard = spy(doubleSignGuard, "guard");

		await validator.prevote(0, 1, 2, undefined);

		guard.calledWith(consensusPublicKey, {
			blockNumber: 1,
			round: 2,
			step: Enums.Consensus.Step.Prevote,
			value: undefined,
		});
	});

	it("#prevote - should not produce a prevote when the guard rejects", async ({ validator, doubleSignGuard }) => {
		doubleSignGuard.guard = async () => {
			throw new Error("double sign");
		};

		await assert.rejects(() => validator.prevote(0, 1, 2, undefined), "double sign");
	});

	it("#precommit - should guard the precommit position before signing", async ({
		validator,
		generatorAddress,
		forger,
		doubleSignGuard,
	}) => {
		const block = await forger.forgeBlock(generatorAddress, 1, 0, await validator.getRandaoReveal(2));
		const guard = spy(doubleSignGuard, "guard");

		await validator.precommit(0, 1, 2, block.hash);

		guard.calledOnce();
		guard.calledWith(consensusPublicKey, {
			blockNumber: 1,
			round: 2,
			step: Enums.Consensus.Step.Precommit,
			value: block.hash,
		});
	});

	it("#precommit - should not produce a precommit when the guard rejects", async ({ validator, doubleSignGuard }) => {
		doubleSignGuard.guard = async () => {
			throw new Error("double sign");
		};

		await assert.rejects(() => validator.precommit(0, 1, 2, undefined), "double sign");
	});

	it("#prevote - should sign against the genesis and previous block hashes", async ({
		validator,
		messageFactory,
	}) => {
		const makeMessage = spy(messageFactory, "makeMessage");

		await validator.prevote(0, 1, 2, undefined);

		// The signature context binds the vote to this chain and to the block it extends,
		// so a vote cannot be replayed on a fork or at a different height.
		assert.equal(makeMessage.getCallArgs(0)[2], {
			genesisBlockHash: GENESIS_BLOCK_HASH,
			previousBlockHash: PREVIOUS_BLOCK_HASH,
		});
	});
});
