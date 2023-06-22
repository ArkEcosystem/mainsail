import { Contracts, Identifiers } from "@mainsail/contracts";

import crypto from "../../core/bin/config/testnet/crypto.json";

import { describe, Factories, Sandbox } from "../../test-framework";
import { blockData, precommitData, prevoteData, proposalData, serializedBlock, validatorMnemonic } from "../test/fixtures/proposal";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { prepareWallet } from "../test/helpers/prepare-wallet";
import { Verifier } from "./verifier";
import { MessageFactory } from "./factory";
import { Precommit } from "./precommit";
import { Prevote } from "./prevote";
import { Types } from "../../test-framework/source/factories";

describe<{
	sandbox: Sandbox;
	factory: MessageFactory;
	blockFactory: Contracts.Crypto.IBlockFactory;
	verifier: Verifier;
	identity: Types.Identity;
}>("Verifier", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		const wallet = await prepareWallet(context);
		const validatorSet = {
			getActiveValidators: () => [wallet],
		};

		context.sandbox.app.bind(Identifiers.ValidatorSet).toConstantValue(validatorSet);
		context.blockFactory = context.sandbox.app.get<Contracts.Crypto.IBlockFactory>(
			Identifiers.Cryptography.Block.Factory,
		);
		context.factory = context.sandbox.app.resolve(MessageFactory);
		context.verifier = context.sandbox.app.resolve(Verifier);

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

	it("#verifyProposal - should correctly verify", async ({ blockFactory, factory, identity, verifier }) => {
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

		const { verified, errors } = await verifier.verifyProposal(proposal);

		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#verifyPrecommit - should correctly verify", async ({ verifier }) => {
		const precommit = new Precommit(precommitData);
		const { verified, errors } = await verifier.verifyPrecommit(precommit);

		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#verifyPrevote - should correctly verify", async ({ verifier }) => {
		const prevote = new Prevote(prevoteData);
		const { verified, errors } = await verifier.verifyPrevote(prevote);

		assert.equal(errors, []);
		assert.true(verified);
	});
});
