import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";

import crypto from "../../core/bin/config/devnet/core/crypto.json";
import { describe, Sandbox } from "@mainsail/test-framework";
import { Factories } from "../../test-factories/source/index.js";
import { Types } from "../../test-factories/source/factories";
import {
	blockData,
	proposalData,
	proposalDataWithValidRound,
	serializedBlock,
	serializedProposal,
	serializedProposalDataWithValidRound,
	validatorMnemonic,
} from "../test/fixtures/index.js";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Factory } from "./factory";

describe<{
	sandbox: Sandbox;
	factory: Factory;
	blockFactory: Contracts.Crypto.BlockFactory;
	identity: Types.Identity;
}>("Factory", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		const wallet = {};
		const validatorSet = {
			getRoundValidators: () => [wallet],
		};

		const workerPool = {
			getWorker: () => {
				return {
					// @ts-ignore
					consensusSignature: (method, message, privateKey) =>
						context.sandbox.app
							.getTagged(Identifiers.Cryptography.Signature.Instance, "type", "consensus")!
							[method](message, privateKey),
					// @ts-ignore
					transactionFactory: (method, message, privateKey) =>
						context.sandbox.app
							.get(Identifiers.Cryptography.Transaction.Factory)!
							[method](message, privateKey),
				};
			},
		};

		context.sandbox.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(validatorSet);
		context.sandbox.app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue(workerPool);

		context.factory = context.sandbox.app.resolve(Factory);
		context.blockFactory = context.sandbox.app.get<Contracts.Crypto.BlockFactory>(
			Identifiers.Cryptography.Block.Factory,
		);

		const identityFactory = await Factories.factory<Factories.Types.Identity>("Identity", crypto);
		const identity = await identityFactory
			.withOptions({
				app: context.sandbox.app,
				keyType: "consensus",
				passphrase: validatorMnemonic,
			})
			.make();

		context.identity = identity;
	});

	it("#makeProposal - should correctly make signed proposal", async ({ factory, identity }) => {
		const proposal = await factory.makeProposal(
			{
				data: {
					serialized: serializedBlock,
				},
				round: 1,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			proposal.signature,
			"b7010f03f72afb5437da8f7ee039a7fee75d6e9c7b02e1b9cbd4ce844cdc0e81233fd312cdd493e4ef2c2a6ac3c9fc8a1967f06a1a205c3daf369ac77f0a895717c520af5e341a3925d23b126d847a6fd1e194a010b89082039e1e5b44352616",
		);
	});

	it("#makeProposal - should correctly make signed proposal, with validRound", async ({
		blockFactory,
		factory,
		identity,
	}) => {
		const data: Contracts.Crypto.ProposedData = {
			block: await blockFactory.fromData(blockData),
			serialized: serializedBlock,
		};

		const proposal = await factory.makeProposal(
			{
				data,
				round: 1,
				validRound: 0,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			proposal.signature,
			"892af5249f657e320738dc71719b542a1b8f662e134b47dab751144688d78b5d7f5cb33e97de3643f3534fb0ca3c5c6407b2322406127dbd9067e2d19837a2ff1f1ecb4d745f3f891b5c40f1659b8047d311a93eaf159cd614b2fb634d067d19",
		);
	});

	it("#makeProposalFromBytes - should be ok", async ({ factory }) => {
		const proposal = await factory.makeProposalFromBytes(Buffer.from(serializedProposal, "hex"));

		const data = proposal.toData();

		assert.equal(proposal.toData(), proposalData);
	});

	it("#makeProposalFromBytes - should be ok, with validRound", async ({ factory }) => {
		const proposal = await factory.makeProposalFromBytes(Buffer.from(serializedProposalDataWithValidRound, "hex"));

		assert.equal(proposal.toData(), proposalDataWithValidRound);
	});
});
