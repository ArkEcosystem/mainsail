import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";

import {
	Proposal,
	ProposalWithValidRound,
	ProposalWithLockProof,
	ProposalWithLockProofAndValidRound,
	blockData,
	blockSerialized,
	validatorMnemonic
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
	const PROPOSAL = ProposalWithLockProofAndValidRound;

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

	it("CREATE DATA", async ({ app }) => {
		const blockSerializer = app.get<Contracts.Crypto.BlockSerializer>(Identifiers.Cryptography.Block.Serializer);
		const blockDeserializer = app.get<Contracts.Crypto.BlockDeserializer>(Identifiers.Cryptography.Block.Deserializer);
		const transactionSerializer = app.get<Contracts.Crypto.TransactionSerializer>(Identifiers.Cryptography.Transaction.Serializer);

		const blockHeaderSerialized = await blockSerializer.serializeHeader(blockData);

		const transactionsSerialized = await Promise.all(blockData.transactions.map((transaction) => transactionSerializer.serialize(transaction)));

		// console.log(blockHeaderSerialized.toString("hex"));
		// console.log(transactionsSerialized.map((tx) => tx.toString("hex")));

		const blockSer = await blockSerializer.serializeWithTransactions({
			...blockData,
			transactions: transactionsSerialized.map((serialized) => ({ serialized })),
		});

		// console.log(blockSerialized.toString("hex"));

		const blockFactory = app.get<Contracts.Crypto.BlockFactory>(Identifiers.Cryptography.Block.Factory);
		const block = await blockFactory.fromHex(blockSer.toString("hex"));

		console.log(block);
		console.log("blockSerialized: ", blockSer.toString("hex"));
	});


	it("#serializePayload - should correctly serialize", async ({ serializer }) => {
		const serialized = await serializer.serializePayload(PROPOSAL.payload);

		assert.equal(serialized.toString("hex"), PROPOSAL.payloadSerialized);
	});

	it.only("#serializeProposalUnsigned - should correctly serialize", async ({ serializer, app, factory }) => {
		const serialized = await serializer.serializeProposalUnsigned(PROPOSAL.proposalDataSerializableUnsigned);

		// console.log("proposalSerializedUnsigned: ", serialized.toString("hex"));

		assert.equal(serialized.toString("hex"), PROPOSAL.proposalSerializedUnsigned);

		const keyPairFactory = app.getTagged<Contracts.Crypto.KeyPairFactory>(
			Identifiers.Cryptography.Identity.KeyPair.Factory,
			"type",
			"consensus",
		);

		const keyPair = await keyPairFactory.fromMnemonic(validatorMnemonic);

		const proposal = await factory.makeProposal(PROPOSAL.proposalDataSerializableUnsigned, keyPair);

		console.log("signature: ", proposal.signature);
		console.log("proposalSerialized: ", proposal.serialized.toString("hex"));

		assert.equal(proposal.serialized.toString("hex"), PROPOSAL.proposalSerialized);
	});

	it("#serializeProposal - should correctly serialize", async ({ serializer }) => {
		const serialized = await serializer.serializeProposal(PROPOSAL.proposalDataSerializable);

		assert.equal(serialized.toString("hex"), PROPOSAL.proposalSerialized);
	});
});
