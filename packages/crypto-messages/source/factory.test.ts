import { Contracts, Identifiers } from "@mainsail/contracts";

import crypto from "../../core/bin/config/testnet/crypto.json";
import { describe, Factories, Sandbox } from "../../test-framework";
import { Types } from "../../test-framework/source/factories";
import {
	blockData,
	precommitData,
	precommitDataNoBlock,
	prevoteData,
	prevoteDataNoBlock,
	proposalData,
	serializedBlock,
	serializedPrecommit,
	serializedPrecommitNoBlock,
	serializedPrevote,
	serializedPrevoteNoBlock,
	serializedProposal,
	validatorMnemonic,
} from "../test/fixtures/proposal";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { prepareWallet } from "../test/helpers/prepare-wallet";
import { MessageFactory } from "./factory";
import { Verifier } from "./verifier";

describe<{
	sandbox: Sandbox;
	factory: MessageFactory;
	blockFactory: Contracts.Crypto.IBlockFactory;
	verifier: Verifier;
	identity: Types.Identity;
}>("Factory", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		const wallet = await prepareWallet(context);
		const validatorSet = {
			getActiveValidators: () => [wallet],
		};

		context.sandbox.app.bind(Identifiers.ValidatorSet).toConstantValue(validatorSet);

		context.factory = context.sandbox.app.resolve(MessageFactory);
		context.verifier = context.sandbox.app.resolve(Verifier);
		context.blockFactory = context.sandbox.app.get<Contracts.Crypto.IBlockFactory>(
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

	it("#makeProposal - should correctly make signed proposal", async ({
		blockFactory,
		factory,
		identity,
		verifier,
	}) => {
		const block: Contracts.Crypto.IProposedBlock = {
			block: await blockFactory.fromData(blockData),
			serialized: Buffer.concat([Buffer.of(0), Buffer.from(serializedBlock, "hex")]).toString("hex"),
		};

		const proposal = await factory.makeProposal(
			{
				block,
				height: 1,
				round: 1,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			proposal.signature,
			"95cd81768db0a8e3ce3811606f82825ba4c741fe3d465dd20a1082f93b659cf2040b39733f22326bf289e04dc6fabad7129abe7a8cd600fbd74a8050581f8137bf9e2a39279e960efa0e3b733af287f96acb2aa15218b88ff0eab13d52d0a714",
		);

		const { verified, errors } = await verifier.verifyProposal(proposal);
		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#makePrecommit - should correctly make signed precommit", async ({ factory, identity, verifier }) => {
		const precommit = await factory.makePrecommit(
			{
				type: Contracts.Crypto.MessageType.Precommit,
				blockId: blockData.id,
				height: 1,
				round: 1,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			precommit.signature,
			"8b8ec21cbbe54aa59e2f7590e3abb7d88339ebed43ec0c2dab4917b963ae614db4316d7d26b80ac2d31d2ff4e0fa4af90a7343e5a15636f81d9c41f7a67af8b6f090acc4384299fc60d14235b377251b6c2f4db948d6c03996e832cbcf676b0a",
		);

		const { verified, errors } = await verifier.verifyPrecommit(precommit);
		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#makePrecommit - should correctly make signed precommit no block", async ({ factory, identity, verifier }) => {
		const precommit = await factory.makePrecommit(
			{
				type: Contracts.Crypto.MessageType.Precommit,
				blockId: undefined,
				height: 1,
				round: 1,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			precommit.signature,
			"904c8055242bd7736a1cf7ce20c8fedeee5f2f8fe3f6cab6a166c36c1be0f616c2b7a333912becfa3ecb799c8cd420a012bf41018f5c52f67a2858a6d5bd016e8ef6f56a84d8a734ba6ce5f9a5260201fd9d73ce8688ff0019df2c07a1c33c4d",
		);

		const { verified, errors } = await verifier.verifyPrecommit(precommit);
		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#makePrevote - should correctly make signed prevote", async ({ factory, identity, verifier }) => {
		const prevote = await factory.makePrevote(
			{
				type: Contracts.Crypto.MessageType.Prevote,
				blockId: blockData.id,
				height: 1,
				round: 1,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			prevote.signature,
			"85f3ddb26799dcc8d83dad963f9f4747c68d84dbd3af45dd85485e172071b27e40fe178c277d6a2e9625d03783ca9265165adc48c4ec0d46802a53b96142f7bf336431e0046cf44ff593381c30f03a9e9204a9b959bf0562c1d1c41394b0c6fd",
		);

		const { verified, errors } = await verifier.verifyPrevote(prevote);
		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#makePrevote - should correctly make signed prevote no block", async ({ factory, identity, verifier }) => {
		const prevote = await factory.makePrevote(
			{
				type: Contracts.Crypto.MessageType.Prevote,
				blockId: undefined,
				height: 1,
				round: 1,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			prevote.signature,
			"927628d67c385fe216aa800def9cce0c09f5f9fbf836583d7c07ab6a98e1b5681802c92f81ad54984236a07fa389dbab1519f3c91ad39a505a61c3624a88c65da71fe721d7af0ed452516771b94d027be713dba68e14fa2c9680e35b63f0e038",
		);

		const { verified, errors } = await verifier.verifyPrevote(prevote);
		assert.equal(errors, []);
		assert.true(verified);
	});

	it.skip("#makeProposalFromBytes - should be ok", async ({ factory, identity, verifier }) => {
		const proposal = await factory.makeProposalFromBytes(Buffer.from(serializedProposal, "hex"));

		assert.equal(proposal.toData(), proposalData);
	});

	it("#makePrevoteFromBytes - should be ok", async ({ factory, identity, verifier }) => {
		const prevote = await factory.makePrevoteFromBytes(Buffer.from(serializedPrevote, "hex"));

		assert.equal(prevote.toData(), prevoteData);
	});

	it("#makePrevoteFromBytes - should be ok with no block", async ({ factory, identity, verifier }) => {
		const prevote = await factory.makePrevoteFromBytes(Buffer.from(serializedPrevoteNoBlock, "hex"));

		assert.equal(prevote.toData(), prevoteDataNoBlock);
	});

	it("#makePrecommitFromBytes - should be ok", async ({ factory, identity, verifier }) => {
		const precommit = await factory.makePrecommitFromBytes(Buffer.from(serializedPrecommit, "hex"));

		assert.equal(precommit.toData(), precommitData);
	});

	it("#makePrecommitFromBytes - should be ok with no block", async ({ factory, identity, verifier }) => {
		const precommit = await factory.makePrecommitFromBytes(Buffer.from(serializedPrecommitNoBlock, "hex"));

		assert.equal(precommit.toData(), precommitDataNoBlock);
	});
});
