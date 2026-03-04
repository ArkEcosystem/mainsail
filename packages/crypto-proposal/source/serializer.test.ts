import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";

import {
	Proposal,
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
		const serialized = await serializer.serializePayload(Proposal.payload);

		assert.equal(serialized.toString("hex"), Proposal.payloadSerialized);
	});

	it("#serializeProposalUnsigned - should correctly serialize", async ({ serializer }) => {
		const serialized = await serializer.serializeProposalUnsigned(Proposal.proposalDataSerializableUnsigned);

		assert.equal(serialized.toString("hex"), Proposal.proposalSerializedUnsigned);
	});

	it("#serializeProposal - should correctly serialize", async ({ serializer }) => {
		const serialized = await serializer.serializeProposal(Proposal.proposalDataSerializable);

		assert.equal(serialized.toString("hex"), Proposal.proposalSerialized);
	});

	it("#serializeLockProof - should correctly serialize", async ({ serializer }) => {
		const serialized = (await serializer.serializeLockProof(lockProof)).toString("hex");

		assert.equal(serialized, serializedLockProof);
	});
});
