import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";

import {
	Proposal,
	ProposalWithValidRound,
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

	it.only("#serializePayload - should correctly serialize", async ({ app }) => {
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
		const blockHeader = await blockDeserializer.deserializeHeader(Buffer.from(blockSerialized, "hex"));

		console.log(block);
		console.log(blockSer.toString("hex"));
	});


	it("#serializePayload - should correctly serialize", async ({ serializer }) => {
		const serialized = await serializer.serializePayload(ProposalWithValidRound.payload);

		assert.equal(serialized.toString("hex"), ProposalWithValidRound.payloadSerialized);
	});

	it("#serializeProposalUnsigned - should correctly serialize", async ({ serializer, app, factory }) => {
		const serialized = await serializer.serializeProposalUnsigned(ProposalWithValidRound.proposalDataSerializableUnsigned);

		console.log(serialized.toString("hex"));

		assert.equal(serialized.toString("hex"), ProposalWithValidRound.proposalSerializedUnsigned);

		const keyPairFactory = app.getTagged<Contracts.Crypto.KeyPairFactory>(
			Identifiers.Cryptography.Identity.KeyPair.Factory,
			"type",
			"consensus",
		);

		const keyPair = await keyPairFactory.fromMnemonic(validatorMnemonic);

		const proposal = await factory.makeProposal(ProposalWithValidRound.proposalDataSerializableUnsigned, keyPair);

		// console.log(proposal.signature);
		// console.log(proposal.serialized.toString("hex"));

		assert.equal(proposal.serialized.toString("hex"), ProposalWithValidRound.proposalSerialized);
	});

	it("#serializeProposal - should correctly serialize", async ({ serializer, app, factory }) => {
		const serialized = await serializer.serializeProposal(ProposalWithValidRound.proposalDataSerializable);

		assert.equal(serialized.toString("hex"), ProposalWithValidRound.proposalSerialized);
	});
});
