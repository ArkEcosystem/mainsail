import { Contracts, Identifiers } from "@mainsail/contracts";

import crypto from "../../core/bin/config/devnet/core/crypto.json";
import { describe, Factories, Sandbox } from "../../test-framework/source";
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
			getRoundValidators: () => [wallet],
		};

		const workerPool = {
			getWorker: () => {
				return {
					// @ts-ignore
					consensusSignature: (method, message, privateKey) =>
						context.sandbox.app
							.getTagged(Identifiers.Cryptography.Signature.Instance, "type", "consensus")!
							[method](message, privateKey),
				};
			},
		};

		context.sandbox.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(validatorSet);
		context.sandbox.app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue(workerPool);

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
		const proposal = await factory.makeProposal(
			{
				data: {
					serialized: serializedBlock,
				},
				round: 1,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			proposal.signature,
			"b7010f03f72afb5437da8f7ee039a7fee75d6e9c7b02e1b9cbd4ce844cdc0e81233fd312cdd493e4ef2c2a6ac3c9fc8a1967f06a1a205c3daf369ac77f0a895717c520af5e341a3925d23b126d847a6fd1e194a010b89082039e1e5b44352616",
		);
	});

	it("#makeProposal - should correctly make signed proposal, with validRound", async ({
		blockFactory,
		factory,
		identity,
	}) => {
		const data: Contracts.Crypto.ProposedData = {
			block: await blockFactory.fromData(blockData),
			serialized: serializedBlock,
		};

		const proposal = await factory.makeProposal(
			{
				data,
				round: 1,
				validRound: 0,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			proposal.signature,
			"892af5249f657e320738dc71719b542a1b8f662e134b47dab751144688d78b5d7f5cb33e97de3643f3534fb0ca3c5c6407b2322406127dbd9067e2d19837a2ff1f1ecb4d745f3f891b5c40f1659b8047d311a93eaf159cd614b2fb634d067d19",
		);
	});

	it("#makePrecommit - should correctly make signed precommit", async ({ factory, identity }) => {
		const precommit = await factory.makePrecommit(precommitData, identity.keys);

		assert.equal(precommit.signature, precommitData.signature);
	});

	it("#makePrecommit - should correctly make signed precommit no block", async ({ factory, identity }) => {
		const precommit = await factory.makePrecommit(
			{
				blockHash: undefined,
				blockNumber: 1,
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
				blockHash: undefined,
				blockNumber: 1,
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
