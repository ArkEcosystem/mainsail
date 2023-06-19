import { Contracts, Identifiers } from "@mainsail/contracts";

import crypto from "../../core/bin/config/testnet/crypto.json";
import validatorsJson from "../../core/bin/config/testnet/validators.json";
import { describe, Factories, Sandbox } from "../../test-framework";
import { Types } from "../../test-framework/source/factories";
import { blockData, precommitData, precommitDataNoBlock, prevoteData, prevoteDataNoBlock, proposalData, serializedBlock, serializedPrecommit, serializedPrecommitNoBlock, serializedPrevote, serializedPrevoteNoBlock, serializedProposal } from "../test/fixtures/proposal";
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
			getActiveValidators: () => [wallet],
		};

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
		const block: Contracts.Crypto.IProposedBlock = {
			block: {
				data: blockData,
				header: { ...blockData },
				serialized: serializedBlock,
				transactions: [],
			},
			serialized: ""
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
			"a0e335c16132d3049c10ae2d013b8acd4404c79894787578fef37b8a5a0844bda59cdd13f24f19eb7908763b6f42184f010747c8f3011b0abfb907d830fbb6336e2151a72df426215e291bc79a4c194b4843eb260d5fb1081f3460feba09d226",
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
			"8bbef0999968534965df6d7422b72a62e4fee579394f657130d055d77860eba25942431892ac868a1aa552e6c9af83ab0b5c29fe23882feaa217bcf606b2a14ba1238b390864175a925093acfcfb34b17a05559ff0c8f69d31ef2100a71c93e4",
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
			"a4f3752c49a483892af7178fa01f65639ad385eba3c8b502d981f6717e3a09a7edd7a2b99a46e6c5f40daee77602a6170b73e1afb6756fa72f9fa22595af5c5bb6f497c602e3c1ffaf65e84b9a51b10cf8b6ea7f928637a67c754c0d1ad82ead",
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
			"b0174f546363b476fe0153d0092ff8a8da9fda11b225fda82d994ba7a9078a28fc609079d745054bb14089651fa7361e0b7772878217e5502e28b32c6ce827741aa7196a7cb4618fe6ff2bf6fcaf9833b5cf14328cd10293b9c689eff018a1ee",
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
			"a466d5b0c3667ef1250d19eb4ad5cac579877a4ca455790eb3174ea796de5999765aed67014f14315b742025b7047b240b5e62f8bfe060600b6b307cdbedee447a08425ecff0260aef0d5c912c8a4c7dbe59667d2c2f86f09207793fd05d1f53",
		);

		const { verified, errors } = await verifier.verifyPrevote(prevote);
		assert.equal(errors, []);
		assert.true(verified);
	});

	it.skip("#makeProposalFromBytes - should be ok", async ({ factory, identity, verifier }) => {
		const proposal = await factory.makeProposalFromBytes(
			Buffer.from(serializedProposal, "hex")
		);

		assert.equal(
			proposal.toData(),
			proposalData,
		);
	});

	it("#makePrevoteFromBytes - should be ok", async ({ factory, identity, verifier }) => {
		const prevote = await factory.makePrevoteFromBytes(
			Buffer.from(serializedPrevote, "hex")
		);

		assert.equal(
			prevote.toData(),
			prevoteData,
		);
	});

	it("#makePrevoteFromBytes - should be ok with no block", async ({ factory, identity, verifier }) => {
		const prevote = await factory.makePrevoteFromBytes(
			Buffer.from(serializedPrevoteNoBlock, "hex")
		);

		console.log(prevote.toSignatureData());

		assert.equal(
			prevote.toData(),
			prevoteDataNoBlock,
		);
	});

	it("#makePrecommitFromBytes - should be ok", async ({ factory, identity, verifier }) => {
		const precommit = await factory.makePrecommitFromBytes(
			Buffer.from(serializedPrecommit, "hex")
		);

		assert.equal(
			precommit.toData(),
			precommitData,
		);
	});

	it("#makePrecommitFromBytes - should be ok with no block", async ({ factory, identity, verifier }) => {
		const precommit = await factory.makePrecommitFromBytes(
			Buffer.from(serializedPrecommitNoBlock, "hex")
		);

		assert.equal(
			precommit.toData(),
			precommitDataNoBlock,
		);
	});
});
