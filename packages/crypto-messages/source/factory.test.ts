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
			"a3fe3de4cfb3bbd3000b71e3ff9cbd4298321ab79d944d557070531b1df9891d47b932fe63894249870e748e554372ba064fb3499a5d657564bc8287ec6143a225997dd7ee85c0d3a82917713a05ad7b6fa833332d587fe40310932cebc030c2",
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
			"ad61353c7ab1a22cf92b350ecfc0d7ba1989f3d8212ed4fed4beee88491fd07f57e819ec066071388a45e92c5ec2128a0885284ad9691b9f5bf4277a8e2e60b37c4bb75d10674f20fa11547d201b168d8ff4fbefa1aba936187529a0e6ca4875",
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
			"aa8647bcb0168beded3a5fa3f7cde55c25d4d4202a5619e2dcda420481e8966954fb32f840335b67d4ad4f1df0101c2d15ceadb7f92fd1659fa6ba4f22facc44c339c0d187f92bb6501d71a7044500a15180495bea31d90a0bbf28fa62590bda",
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
			"98efe3774344600672805398fceed75ced4ca89a4a7b1b66273ff2017a9b22b277e7d54eacb01c114d617376a2f3b41e0287ed450f689e82c475c36ed003ca0b2b4cafaa7282eff1cca3faba287c4d752c313fc5d791911f24d46d006fc93b30",
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
			"955d77cfaec08b05504654bf2593c36ac515a3c2f5776ce4d5ab6472b2f8b60c24fdf435439e8758dbee24bc67d4110d114e600b6a90b9d814a051c6bd2578e1081c2576d4a5938343555d78cf83042d3e4ece474cfce00b00d25bff4c4beb2a",
		);

		const { verified, errors } = await verifier.verifyPrevote(prevote.toData());
		assert.equal(errors, []);
		assert.true(verified);
	});
});
