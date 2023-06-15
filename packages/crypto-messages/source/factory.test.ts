import { Contracts, Identifiers } from "@mainsail/contracts";

import crypto from "../../core/bin/config/testnet/crypto.json";
import validatorsJson from "../../core/bin/config/testnet/validators.json";
import { describe, Factories, Sandbox } from "../../test-framework";
import { Types } from "../../test-framework/source/factories";
import { blockData, serializedBlock } from "../test/fixtures/proposal";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { prepareWallet } from "../test/helpers/prepare-wallet";
import { MessageFactory } from "./factory";
import { Verifier } from "./verifier";

describe<{
	sandbox: Sandbox;
	factory: MessageFactory;
	verifier: Verifier;
	identity: Types.Identity;
}>("Factory", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		const wallet = await prepareWallet(context);
		const validatorSet = {
			getActiveValidators: () => [wallet]
		}

		context.sandbox.app.bind(Identifiers.ValidatorSet).toConstantValue(validatorSet);

		context.factory = context.sandbox.app.resolve(MessageFactory);
		context.verifier = context.sandbox.app.resolve(Verifier);

		const identityFactory = await Factories.factory("Identity", crypto);
		const identity = await identityFactory
			.withOptions({
				app: context.sandbox.app,
				keyType: "consensus",
				passphrase: validatorsJson.secrets[0],
			})
			.make<Types.Identity>();

		context.identity = identity;
	});

	it("#makeProposal - should correctly make signed proposal", async ({ factory, identity, verifier }) => {
		const block: Contracts.Crypto.IBlock = {
			data: blockData,
			header: { ...blockData },
			serialized: serializedBlock,
			transactions: [],
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
			"8de4ef3411e8ad5d90ca57077a1dabe1c0a680d69e621d182e618678fccd47ec18d6cca8f6e711f9329c70d8253c5a33032068e766004ea161792fe3ea17ce7e93307e9045e2586a4f06407224a6ee9faab6a421b28b715d77a9ec5b8ef6837d",
		);

		const { verified, errors } = await verifier.verifyProposal(proposal.toData());
		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#makePrecommit - should correctly make signed precommit", async ({ factory, identity, verifier }) => {
		const precommit = await factory.makePrecommit(
			{
				blockId: blockData.id,
				height: 1,
				round: 1,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			precommit.signature,
			"98c038d18ceca69b37759bab0a83e6d40d129b7885686de0f0b651f401fab7970f9c2d5bb9a6d0cf56377f13175a56c516fed75e56f7fbe2c610f19791af5bdec74abf79c9292019134983a8ebb9d8c51fcabd55571791fdf25a4615a6421fe9",
		);

		const { verified, errors } = await verifier.verifyPrecommit(precommit.toData());
		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#makePrecommit - should correctly make signed precommit no block", async ({ factory, identity, verifier }) => {
		const precommit = await factory.makePrecommit(
			{
				blockId: undefined,
				height: 1,
				round: 1,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			precommit.signature,
			"938354609ccf7ad10eca105f5f2990c847c3f0dc11ae7b75ef5512b32621ab8a21c1f34e22da54bd821d29edbc809c8007b49b4d04dc1df04aa0d328e07718f469f440f5b7de21d4fb5e85b40af925db73fc87df84b372dd31d66145390a334b",
		);

		const { verified, errors } = await verifier.verifyPrecommit(precommit.toData());
		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#makePrevote - should correctly make signed prevote", async ({ factory, identity, verifier }) => {
		const prevote = await factory.makePrevote(
			{
				blockId: blockData.id,
				height: 1,
				round: 1,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			prevote.signature,
			"98c038d18ceca69b37759bab0a83e6d40d129b7885686de0f0b651f401fab7970f9c2d5bb9a6d0cf56377f13175a56c516fed75e56f7fbe2c610f19791af5bdec74abf79c9292019134983a8ebb9d8c51fcabd55571791fdf25a4615a6421fe9",
		);

		const { verified, errors } = await verifier.verifyPrevote(prevote.toData());
		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#makePrevote - should correctly make signed prevote no block", async ({ factory, identity, verifier }) => {
		const prevote = await factory.makePrevote(
			{
				blockId: undefined,
				height: 1,
				round: 1,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			prevote.signature,
			"938354609ccf7ad10eca105f5f2990c847c3f0dc11ae7b75ef5512b32621ab8a21c1f34e22da54bd821d29edbc809c8007b49b4d04dc1df04aa0d328e07718f469f440f5b7de21d4fb5e85b40af925db73fc87df84b372dd31d66145390a334b",
		);

		const { verified, errors } = await verifier.verifyPrevote(prevote.toData());
		assert.equal(errors, []);
		assert.true(verified);
	});
});
