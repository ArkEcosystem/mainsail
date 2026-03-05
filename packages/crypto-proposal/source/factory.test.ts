import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";

import crypto from "../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Factories } from "../../test-factories/source/index.js";
import { Types } from "../../test-factories/source/factories";
import {
	blockHeader,
	Proposal,
	serializedBlock,
	validatorMnemonic,
} from "../test/fixtures/index.js";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Factory } from "./factory";

describe<{
	app: Application;
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
						context.app
							.getTagged(Identifiers.Cryptography.Signature.Instance, "type", "consensus")!
							[method](message, privateKey),
					// @ts-ignore
					transactionFactory: (method, message, privateKey) =>
						context.app.get(Identifiers.Cryptography.Transaction.Factory)![method](message, privateKey),
				};
			},
		};

		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(validatorSet);
		context.app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue(workerPool);

		context.factory = context.app.resolve(Factory);
		context.blockFactory = context.app.get<Contracts.Crypto.BlockFactory>(Identifiers.Cryptography.Block.Factory);

		const identityFactory = await Factories.factory<Factories.Types.Identity>("Identity", crypto);
		const identity = await identityFactory
			.withOptions({
				app: context.app,
				keyType: "consensus",
				passphrase: validatorMnemonic,
			})
			.make();

		context.identity = identity;
	});

	it("#makeProposal - should correctly make signed proposal", async ({ factory, identity }) => {
		const proposal = await factory.makeProposal(
			Proposal.proposalDataSerializableUnsigned,
			identity.keys,
		);

		assert.equal(
			proposal.toSerializableData(),
			Proposal.proposalDataSerializable
		);

		console.log("Block Header: ", proposal.blockHeader);

		// assert.equal(proposal.blockHeader, blockHeader);
	});

	// it("#makeProposalFromBytes - should be ok", async ({ factory }) => {
	// 	const proposal = await factory.makeProposalFromBytes(Buffer.from(serializedProposal, "hex"));

	// 	assert.equal(proposal.toData(), proposalData);
	// });

});
