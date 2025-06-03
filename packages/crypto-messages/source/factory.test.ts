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
			"82841e0f25ac4bd6745ea2b80c314742e0e4b98073fa78c45e648c0f36037255ce5c2eb588fe4f4078ed9079202b427e0dad5008a81abb51573cdd50eebfda7ce7342700b8c319ef6dbf6adcbe96067584fe408b9d17fdb82e9787e71dc823e7",
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
			"86c1fde96bb08ea505276c8db238ab95a8f463c325cfec7789a5f7891d62306f998b2698177d1cd1a2b0800fb628b88519ef65e2d54a017425be273be0ac8275ce1fa256b6592de55a0eacec9032b7ca1b3df98c115ec743669eb8ed30c721bb",
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
