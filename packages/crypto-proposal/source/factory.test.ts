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
	ProposalWithValidRound,
	ProposalWithLockProof,
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
	const proposals = [Proposal, ProposalWithValidRound, ProposalWithLockProof];

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
		for(const { proposalDataSerializableUnsigned, proposalDataSerializable, proposalData } of proposals) {
			const proposal = await factory.makeProposal(
				proposalDataSerializableUnsigned,
				identity.keys,
			);

			assert.equal(
				proposal.toSerializableData(),
				proposalDataSerializable
			);
			assert.equal(proposal.blockHeader, blockHeader);
			assert.equal(proposal.toData(), proposalData);
		}
	});

	it("#makeProposalFromBytes - should be ok", async ({ factory }) => {
		for(const { proposalSerialized, proposalDataSerializable, proposalData } of proposals) {
			const proposal = await factory.makeProposalFromBytes(Buffer.from(proposalSerialized, "hex"));

			assert.equal(
				proposal.toSerializableData(),
				proposalDataSerializable
			);
			assert.equal(proposal.blockHeader, blockHeader);
			assert.equal(proposal.toData(), proposalData);
		}
	});

	it("#makeProposalFromData - should be ok", async ({ factory }) => {
		for(const { proposalDataSerializable, proposalData } of proposals) {
			const proposal = await factory.makeProposalFromData(proposalData);

			assert.equal(
				proposal.toSerializableData(),
				proposalDataSerializable
			);
			assert.equal(proposal.blockHeader, blockHeader);
			assert.equal(proposal.toData(), proposalData);
		}
	});

	it("#makeProposalFromData - should be ok", async ({ factory }) => {
		for(const { payloadSerialized, payload } of proposals) {
			const newPayload = await factory.makePayloadFromBytes(Buffer.from(payloadSerialized, "hex"));

			assert.equal(
				newPayload.block.serialized,
				payload.block.serialized
			);
			assert.equal(
				newPayload.lockProof,
				payload.lockProof
			);
		}
	});
});
