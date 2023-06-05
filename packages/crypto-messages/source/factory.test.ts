import crypto from "../../core/bin/config/testnet/crypto.json";
import { describe, Factories, Sandbox } from "../../test-framework";
import { blockData } from "../test/fixtures/proposal";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { MessageFactory } from "./factory";
import { Types } from "../../test-framework/source/factories";
import { Verifier } from "./verifier";

describe<{
	sandbox: Sandbox;
	factory: MessageFactory;
	verifier: Verifier;
	identity: Types.Identity;
}>("Verifier", ({ it, assert, beforeEach }) => {
	const mnemonic =
		"question measure debris increase false feature journey height fun agent coach office only shell nation skill track upset distance behave easy devote floor shy";

	beforeEach(async (context) => {
		await prepareSandbox(context);
		context.factory = context.sandbox.app.resolve(MessageFactory);
		context.verifier = context.sandbox.app.resolve(Verifier);

		const identityFactory = await Factories.factory("Identity", crypto);
		const identity = await identityFactory
			.withOptions({ passphrase: mnemonic, keyType: "consensus", app: context.sandbox.app })
			.make<Types.Identity>();

		context.identity = identity;
	});

	it("#makeProposal - should correctly make signed proposal", async ({ factory, identity, verifier }) => {
		const block = {
			header: { ...blockData, transactions: undefined },
			serialized: "",
			transactions: [],
			data: blockData,
		};

		const proposal = await factory.makeProposal(
			{
				block,
				height: 1,
				round: 1,
				validatorPublicKey:
					"b4865127896c3c5286296a7b26e7c8002586a3ecf5832bfb59e689336f1f4c75e10491b9dfaed8dfb2c2fbe22d11fa93",
			},
			identity.keys,
		);

		assert.equal(
			proposal.signature,
			"af9601b4797ab6712531dd5787c8c2d26be798899975b4573727caa11eb926e62e3c04a534503997f9c0aa68a21e87700729aa49371e0d2a3e1f909edbc9d49902a929f5213fbe87f8ee802c6e6775d1ab199a07e9d45aa5682f4c76c592d8f7",
		);
		assert.true((await verifier.verifyProposal(proposal.toData())).verified);
	});

	it("#makePrecommit - should correctly make signed precommit", async ({ factory, identity, verifier }) => {
		const precommit = await factory.makePrecommit(
			{
				height: 1,
				round: 1,
				blockId: undefined,
				validatorPublicKey:
					"b4865127896c3c5286296a7b26e7c8002586a3ecf5832bfb59e689336f1f4c75e10491b9dfaed8dfb2c2fbe22d11fa93",
			},
			identity.keys,
		);

		assert.equal(
			precommit.signature,
			"b6ea5c04971f3c5ca1b553c8f0f0bce9640f07b71ce4ef1651f5d7eb1ac0c5a08db09ae795d5988876ea92c3b515e627097afaf316583e610fffefdb94262576b5418f0eeaef8d4437d9134b21182b8797ad0a499530b0cd92cd6387ae682b90",
		);
		assert.true((await verifier.verifyPrecommit(precommit.toData())).verified);
	});

	it("#makePrevote - should correctly make signed prevote", async ({ factory, identity, verifier }) => {
		const prevote = await factory.makePrevote(
			{
				height: 1,
				round: 1,
				blockId: undefined,
				validatorPublicKey:
					"b4865127896c3c5286296a7b26e7c8002586a3ecf5832bfb59e689336f1f4c75e10491b9dfaed8dfb2c2fbe22d11fa93",
			},
			identity.keys,
		);

		assert.equal(
			prevote.signature,
			"b6ea5c04971f3c5ca1b553c8f0f0bce9640f07b71ce4ef1651f5d7eb1ac0c5a08db09ae795d5988876ea92c3b515e627097afaf316583e610fffefdb94262576b5418f0eeaef8d4437d9134b21182b8797ad0a499530b0cd92cd6387ae682b90",
		);
		assert.true((await verifier.verifyPrevote(prevote.toData())).verified);
	});
});
