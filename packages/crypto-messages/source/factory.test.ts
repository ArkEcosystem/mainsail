import crypto from "../../core/bin/config/testnet/crypto.json";
import { describe, Factories, Sandbox } from "../../test-framework";
import { blockData, serializedBlock } from "../test/fixtures/proposal";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { MessageFactory } from "./factory";
import { Types } from "../../test-framework/source/factories";
import { Verifier } from "./verifier";
import { Contracts } from "@mainsail/contracts";

describe<{
	sandbox: Sandbox;
	factory: MessageFactory;
	verifier: Verifier;
	identity: Types.Identity;
}>("Factory", ({ it, assert, beforeEach }) => {
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
		const block: Contracts.Crypto.IBlock = {
			header: { ...blockData, transactions: [] },
			serialized: serializedBlock,
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
			"b184631bf2f87b85b727981b8c1f19cde1fd4b69fd75617437e8495060b6ad5c997be908d6e11c6255b4aee2d49011c317d087e66b889af205e9ac8799238843bfbd08bb7de6a3ff5ec52602e14fa2440cba094296588c13c09312b727225d6e",
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
			"8c32ffc4d5fe8aa9a3b3a5623c1b805a50095bc5b53940abc62d22f84e55fab406ba530b3dc3d8082ed9bec0c660094a010c2320e5a201612b9fbac78b0d2664b3e7bc1e4442734ab8a3fc378567c0d8109ba0192da90c6faaa0e215be842ee0",
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
			"8c32ffc4d5fe8aa9a3b3a5623c1b805a50095bc5b53940abc62d22f84e55fab406ba530b3dc3d8082ed9bec0c660094a010c2320e5a201612b9fbac78b0d2664b3e7bc1e4442734ab8a3fc378567c0d8109ba0192da90c6faaa0e215be842ee0",
		);
		assert.true((await verifier.verifyPrevote(prevote.toData())).verified);
	});
});
