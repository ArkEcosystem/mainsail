import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Identifiers } from "@mainsail/constants";

import {
	Proposal,
	ProposalWithValidRound,
	lockProof,
	serializedLockProof
} from "../test/fixtures/index.js";

import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Deserializer } from "./deserializer";
import { Serializer } from "./serializer";
import { Factory } from "./factory.js";

describe<{
	app: Application;
	serializer: Serializer;
	deserializer: Deserializer;
	factory: Factory;
}>("Serializer", ({ it, assert, beforeEach }) => {
	const proposals = [Proposal, ProposalWithValidRound];

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

		context.serializer = context.app.resolve(Serializer);
		context.deserializer = context.app.resolve(Deserializer);
		context.factory = context.app.resolve(Factory);
	});

	it("#serializePayload - should correctly serialize", async ({ serializer }) => {
		for(const { payload, payloadSerialized } of proposals) {
			const serialized = await serializer.serializePayload(payload);
			assert.equal(serialized.toString("hex"), payloadSerialized);
		}
	});

	it("#serializeProposalUnsigned - should correctly serialize", async ({ serializer }) => {
		for(const { proposalDataSerializableUnsigned, proposalSerializedUnsigned } of proposals) {
			const serialized = await serializer.serializeProposalUnsigned(proposalDataSerializableUnsigned);
			assert.equal(serialized.toString("hex"), proposalSerializedUnsigned);
		}
	});

	it("#serializeProposal - should correctly serialize", async ({ serializer }) => {
		for(const { proposalDataSerializable, proposalSerialized } of proposals) {
			const serialized = await serializer.serializeProposal(proposalDataSerializable);
			assert.equal(serialized.toString("hex"), proposalSerialized);
		}
	});

	it("#serializeLockProof - should correctly serialize", async ({ serializer }) => {
		const serialized = (await serializer.serializeLockProof(lockProof)).toString("hex");
		assert.equal(serialized, serializedLockProof);
	});
});
