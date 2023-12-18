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
			serialized: Buffer.concat([Buffer.of(0), Buffer.from(serializedBlock, "hex")]).toString("hex"),
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
			"8b4db95de1a65f70ae05cbfce0013f4ad3a5545b32206288751517661d59633dd289a743c5ab0892c5be4e1a91547692030d1120248fefba361e276e1364ced22d5b00348efadc27e8d3ffd7080686c9d4ae22596c255725e0b4dad712389c29",
		);
	});

	it("#makeProposal - should correctly make signed proposal, with validRound", async ({
		blockFactory,
		factory,
		identity,
	}) => {
		const block: Contracts.Crypto.ProposedBlock = {
			block: await blockFactory.fromData(blockData),
			serialized: Buffer.concat([Buffer.of(0), Buffer.from(serializedBlock, "hex")]).toString("hex"),
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
			"a363e8a7cbea147f5f711a6042ac0185594b1cfbd96fb8eae6d52f77b00ef33c9028e5a60a6a897f28e33a6a2ba17bb206bdf91e25eb9acdab46b857422b7caa3bd07387253c6976362bd1ab36aa681b0c90a40e3b0b20ea1c0c884fda0b3cce",
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

	it.skip("#makeProposalFromBytes - should be ok", async ({ factory }) => {
		const proposal = await factory.makeProposalFromBytes(Buffer.from(serializedProposal, "hex"));

		assert.equal(proposal.toData(), proposalData);
	});

	it.skip("#makeProposalFromBytes - should be ok, with validRound", async ({ factory }) => {
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
