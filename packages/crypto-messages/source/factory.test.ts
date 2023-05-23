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
		const identity = await identityFactory.withOptions({ passphrase: mnemonic, keyType: "consensus", app: context.sandbox.app }).make<Types.Identity>();

		context.identity = identity;
	});

	it("#makeProposal - should correctly make signed proposal", async ({ factory, identity, verifier }) => {
		const block = {
			header: { ...blockData, transactions: undefined },
			serialized: "",
			transactions: [],
			data: blockData,
		};

		const proposal = await factory.makeProposal({
			block,
			height: 1,
			round: 1,
			validatorPublicKey: "b4865127896c3c5286296a7b26e7c8002586a3ecf5832bfb59e689336f1f4c75e10491b9dfaed8dfb2c2fbe22d11fa93",
		}, identity.keys);

		assert.equal(proposal.signature, "a456bcc066cc0d887ebc1099c9888d7199f97a99384708c68b355f8c4833676208a8b5e979dacb61aa2b8789b15c7a4119ea3271f82d44eee0b963b77ab4cd0754338075c9c661d95445606b4a18f513ee734b46f8c8cd7803549beaef868cda");
		assert.true((await verifier.verifyProposal(proposal.toData())).verified);
	});

	it("#makePrecommit - should correctly make signed precommit", async ({ factory, identity, verifier }) => {
		const precommit = await factory.makePrecommit({
			height: 1,
			round: 1,
			blockId: undefined,
			validatorPublicKey: "b4865127896c3c5286296a7b26e7c8002586a3ecf5832bfb59e689336f1f4c75e10491b9dfaed8dfb2c2fbe22d11fa93",
		}, identity.keys);

		assert.equal(precommit.signature, "b4fc1cadcfa0de06fb8fa536f2aa43c2cf98e6ebfae16da351735e2b27c4745d7bd0d89a92347a9faff08a45b2efa4100e254322fde8b4604bcff5d3c04b26d306d43f464b081a2fd0c6a5c92f036ff158f4cc198e38b95df21626b2d8374581");
		assert.true((await verifier.verifyPrecommit(precommit.toData())).verified);
	});

	it("#makePrevote - should correctly make signed prevote", async ({ factory, identity, verifier }) => {
		const prevote = await factory.makePrevote({
			height: 1,
			round: 1,
			blockId: undefined,
			validatorPublicKey: "b4865127896c3c5286296a7b26e7c8002586a3ecf5832bfb59e689336f1f4c75e10491b9dfaed8dfb2c2fbe22d11fa93",
		}, identity.keys);

		assert.equal(prevote.signature, "b4fc1cadcfa0de06fb8fa536f2aa43c2cf98e6ebfae16da351735e2b27c4745d7bd0d89a92347a9faff08a45b2efa4100e254322fde8b4604bcff5d3c04b26d306d43f464b081a2fd0c6a5c92f036ff158f4cc198e38b95df21626b2d8374581");
		assert.true((await verifier.verifyPrevote(prevote.toData())).verified);
	});
});
