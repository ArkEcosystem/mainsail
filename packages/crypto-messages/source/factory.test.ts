import crypto from "../../core/bin/config/testnet/crypto.json";
import { describe, Factories, Sandbox } from "../../test-framework";
import { blockData, serializedBlock } from "../test/fixtures/proposal";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { MessageFactory } from "./factory";
import { Types } from "../../test-framework/source/factories";
import { Verifier } from "./verifier";
import { Contracts } from "@mainsail/contracts";
import validatorsJson from "../../core/bin/config/testnet/validators.json";

describe<{
	sandbox: Sandbox;
	factory: MessageFactory;
	verifier: Verifier;
	identity: Types.Identity;
}>("Factory", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);
		context.factory = context.sandbox.app.resolve(MessageFactory);
		context.verifier = context.sandbox.app.resolve(Verifier);

		const identityFactory = await Factories.factory("Identity", crypto);
		const identity = await identityFactory
			.withOptions({
				passphrase: validatorsJson.secrets[0],
				keyType: "consensus",
				app: context.sandbox.app,
			})
			.make<Types.Identity>();

		context.identity = identity;
	});

	it("#makeProposal - should correctly make signed proposal", async ({ factory, identity, verifier }) => {
		const block: Contracts.Crypto.IBlock = {
			header: { ...blockData },
			serialized: serializedBlock,
			transactions: [],
			data: blockData,
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
			"92bed4f1f944f9f1afaccbd69099ca63580aa5d516a295a70815be478066efbe49ea9ab49afb064c018ce1dfc6ca98150ebbebc445cc3e6a3fb3871e6dff77843439d8993c614e9eebb8f4509386f82104d783f8b46716eddb16388aeed14c64",
		);

		const { verified, errors } = await verifier.verifyProposal(proposal.toData());
		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#makePrecommit - should correctly make signed precommit", async ({ factory, identity, verifier }) => {
		const precommit = await factory.makePrecommit(
			{
				height: 1,
				round: 1,
				blockId: blockData.id,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			precommit.signature,
			"8b3721603129afea5e6aa7e4201875b070228decfcba8acdd89d94066caddcc62e516d2f0502d910af9128d722b16c141489d765e7c7388fdcdc7932f25fd4e32a55cdf02c2ba1f35fec306873ed25c7b139656deac0a9f73608569cec3c0a63",
		);

		const { verified, errors } = await verifier.verifyPrecommit(precommit.toData());
		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#makePrecommit - should correctly make signed precommit no block", async ({ factory, identity, verifier }) => {
		const precommit = await factory.makePrecommit(
			{
				height: 1,
				round: 1,
				blockId: undefined,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			precommit.signature,
			"a306c92bc07dbb276d7f6ed586fface06f5e2a4f19789062fd7884d15b05ce7ba4fdc94eb996c25eb911940376cf94f4112ec60e168d40b7874cbf362a55162348def985b6b499b9b06d08d6d262a343f9a08a5026ad979632ee9c5c894e24ae",
		);

		const { verified, errors } = await verifier.verifyPrecommit(precommit.toData());
		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#makePrevote - should correctly make signed prevote", async ({ factory, identity, verifier }) => {
		const prevote = await factory.makePrevote(
			{
				height: 1,
				round: 1,
				blockId: blockData.id,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			prevote.signature,
			"8b3721603129afea5e6aa7e4201875b070228decfcba8acdd89d94066caddcc62e516d2f0502d910af9128d722b16c141489d765e7c7388fdcdc7932f25fd4e32a55cdf02c2ba1f35fec306873ed25c7b139656deac0a9f73608569cec3c0a63",
		);

		const { verified, errors } = await verifier.verifyPrevote(prevote.toData());
		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#makePrevote - should correctly make signed prevote no block", async ({ factory, identity, verifier }) => {
		const prevote = await factory.makePrevote(
			{
				height: 1,
				round: 1,
				blockId: undefined,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			prevote.signature,
			"a306c92bc07dbb276d7f6ed586fface06f5e2a4f19789062fd7884d15b05ce7ba4fdc94eb996c25eb911940376cf94f4112ec60e168d40b7874cbf362a55162348def985b6b499b9b06d08d6d262a343f9a08a5026ad979632ee9c5c894e24ae",
		);

		const { verified, errors } = await verifier.verifyPrevote(prevote.toData());
		assert.equal(errors, []);
		assert.true(verified);
	});
});
