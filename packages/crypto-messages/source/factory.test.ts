import { Contracts, Identifiers } from "@mainsail/contracts";

import crypto from "../../core/bin/config/testnet/mainsail/crypto.json";
import { describe, Factories, Sandbox } from "../../test-framework";
import { Types } from "../../test-framework/source/factories";
import {
	blockData,
	precommitData,
	precommitDataNoBlock,
	prevoteData,
	prevoteDataNoBlock,
	proposalData,
	proposalDataWithValidRound,
	serializedBlock,
	serializedPrecommit,
	serializedPrecommitNoBlock,
	serializedPrevote,
	serializedPrevoteNoBlock,
	serializedProposal,
	serializedProposalDataWithValidRound,
	validatorMnemonic,
} from "../test/fixtures/proposal";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { MessageFactory } from "./factory";

describe<{
	sandbox: Sandbox;
	factory: MessageFactory;
	blockFactory: Contracts.Crypto.BlockFactory;
	identity: Types.Identity;
}>("Factory", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		const wallet = {};
		const validatorSet = {
			getActiveValidators: () => [wallet],
		};

		const workerPool = {
			getWorker: () => {
				return {
					// @ts-ignore
					consensusSignature: (method, message, privateKey) =>
						context.sandbox.app
							.getTagged(Identifiers.Cryptography.Signature, "type", "consensus")!
							[method](message, privateKey),
				};
			},
		};

		context.sandbox.app.bind(Identifiers.ValidatorSet).toConstantValue(validatorSet);
		context.sandbox.app.bind(Identifiers.StateService).toConstantValue({});
		context.sandbox.app.bind(Identifiers.Ipc.WorkerPool).toConstantValue(workerPool);

		context.factory = context.sandbox.app.resolve(MessageFactory);
		context.blockFactory = context.sandbox.app.get<Contracts.Crypto.BlockFactory>(
			Identifiers.Cryptography.Block.Factory,
		);

		const identityFactory = await Factories.factory("Identity", crypto);
		const identity = await identityFactory
			.withOptions({
				app: context.sandbox.app,
				keyType: "consensus",
				passphrase: validatorMnemonic,
			})
			.make<Types.Identity>();

		context.identity = identity;
	});

	it("#makeProposal - should correctly make signed proposal", async ({ blockFactory, factory, identity }) => {
		const block: Contracts.Crypto.ProposedBlock = {
			block: await blockFactory.fromData(blockData),
			serialized: serializedBlock,
		};

		const proposal = await factory.makeProposal(
			{
				block,
				round: 1,
				validatorIndex: 0,
			},
			identity.keys,
		);
		assert.equal(
			proposal.signature,
			"b25fd16693a2246d3e9dff3d7ae3da1473c1b24f6ef8b33c69e38e21e32c9ca307ae5f7d4573e2679ec48ecc2f1ff89d16115d8e7f6ffcba72cc9a746bcc40cdd0f9120d87c20addb55baceea2cb8cdb75faaf036e6a4221d28dc8f6558d8cc1",
		);
	});

	it("#makeProposal - should correctly make signed proposal, with validRound", async ({
		blockFactory,
		factory,
		identity,
	}) => {
		const block: Contracts.Crypto.ProposedBlock = {
			block: await blockFactory.fromData(blockData),
			serialized: serializedBlock,
		};

		const proposal = await factory.makeProposal(
			{
				block,
				round: 1,
				validRound: 0,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			proposal.signature,
			"88276dd41eb9fc2b5cde4320b1c6dfc12bf5d71de1d82b79b8d6d00e78d2abfe6f242a823502edfe34ada370e38be22d093f974a720e01cbe21e867f1fd93d0fbb234f75a5d4a42a54516d616917fed46d2d5c2088665d3207b352360c167b34",
		);
	});

	it("#makePrecommit - should correctly make signed precommit", async ({ factory, identity }) => {
		const precommit = await factory.makePrecommit(precommitData, identity.keys);

		assert.equal(precommit.signature, precommitData.signature);
	});

	it("#makePrecommit - should correctly make signed precommit no block", async ({ factory, identity }) => {
		const precommit = await factory.makePrecommit(
			{
				blockId: undefined,
				height: 1,
				round: 1,
				type: Contracts.Crypto.MessageType.Precommit,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			precommit.signature,
			"904c8055242bd7736a1cf7ce20c8fedeee5f2f8fe3f6cab6a166c36c1be0f616c2b7a333912becfa3ecb799c8cd420a012bf41018f5c52f67a2858a6d5bd016e8ef6f56a84d8a734ba6ce5f9a5260201fd9d73ce8688ff0019df2c07a1c33c4d",
		);
	});

	it("#makePrevote - should correctly make signed prevote", async ({ factory, identity }) => {
		const prevote = await factory.makePrevote(prevoteData, identity.keys);

		assert.equal(prevote.signature, prevoteData.signature);
	});

	it("#makePrevote - should correctly make signed prevote no block", async ({ factory, identity }) => {
		const prevote = await factory.makePrevote(
			{
				blockId: undefined,
				height: 1,
				round: 1,
				type: Contracts.Crypto.MessageType.Prevote,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			prevote.signature,
			"927628d67c385fe216aa800def9cce0c09f5f9fbf836583d7c07ab6a98e1b5681802c92f81ad54984236a07fa389dbab1519f3c91ad39a505a61c3624a88c65da71fe721d7af0ed452516771b94d027be713dba68e14fa2c9680e35b63f0e038",
		);
	});

	it("#makeProposalFromBytes - should be ok", async ({ factory }) => {
		const proposal = await factory.makeProposalFromBytes(Buffer.from(serializedProposal, "hex"));

		assert.equal(proposal.toData(), proposalData);
	});

	it("#makeProposalFromBytes - should be ok, with validRound", async ({ factory }) => {
		const proposal = await factory.makeProposalFromBytes(Buffer.from(serializedProposalDataWithValidRound, "hex"));

		assert.equal(proposal.toData(), proposalDataWithValidRound);
	});

	it("#makePrevoteFromBytes - should be ok", async ({ factory }) => {
		const prevote = await factory.makePrevoteFromBytes(Buffer.from(serializedPrevote, "hex"));

		assert.equal(prevote.toData(), prevoteData);
	});

	it("#makePrevoteFromBytes - should be ok with no block", async ({ factory }) => {
		const prevote = await factory.makePrevoteFromBytes(Buffer.from(serializedPrevoteNoBlock, "hex"));

		assert.equal(prevote.toData(), prevoteDataNoBlock);
	});

	it("#makePrecommitFromBytes - should be ok", async ({ factory }) => {
		const precommit = await factory.makePrecommitFromBytes(Buffer.from(serializedPrecommit, "hex"));

		assert.equal(precommit.toData(), precommitData);
	});

	it("#makePrecommitFromBytes - should be ok with no block", async ({ factory }) => {
		const precommit = await factory.makePrecommitFromBytes(Buffer.from(serializedPrecommitNoBlock, "hex"));

		assert.equal(precommit.toData(), precommitDataNoBlock);
	});
});
