import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import type { Application } from "@mainsail/kernel";

import { Deserializer } from "../../source/deserializer.js";
import { Factory } from "../../source/factory.js";
import { Serializer } from "../../source/serializer.js";
import { blockData, Proposal, validatorMnemonic } from "../fixtures/index.js";
import { prepareSandbox } from "./prepare-sandbox.js";

type Context = {
	app: Application;
	serializer: Serializer;
	deserializer: Deserializer;
	factory: Factory;
};

const PROPOSAL = Proposal;

const beforeEach = async (context: Context) => {
	await prepareSandbox(context);

	context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setHeight(1);

	const wallet = {};
	const validatorSet = {
		getRoundValidators: () => [wallet],
	};

	const workerPool = {
		getWorker: () => ({
			consensusSignature: (method, message, privateKey) =>
				context.app
					.getTagged(Identifiers.Cryptography.Signature.Instance, "type", "consensus")!
					[method](message, privateKey),
			transactionFactory: (method, message, privateKey) =>
				context.app.get(Identifiers.Cryptography.Transaction.Factory)![method](message, privateKey),
		}),
	};

	context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(validatorSet);
	context.app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue(workerPool);

	context.serializer = context.app.resolve(Serializer);
	context.deserializer = context.app.resolve(Deserializer);
	context.factory = context.app.resolve(Factory);
};

const createBlock = async ({ app }: Context) => {
	const blockSerializer = app.get<Contracts.Crypto.BlockSerializer>(Identifiers.Cryptography.Block.Serializer);
	const transactionSerializer = app.get<Contracts.Crypto.TransactionSerializer>(
		Identifiers.Cryptography.Transaction.Serializer,
	);

	const blockHeaderSerialized = await blockSerializer.serializeHeader(blockData);
	const transactionsSerialized = await Promise.all(
		blockData.transactions.map((transaction) => transactionSerializer.serialize(transaction)),
	);

	// console.log(blockHeaderSerialized.toString("hex"));
	// console.log(transactionsSerialized.map((tx) => tx.toString("hex")));

	const blockSer = await blockSerializer.serializeWithTransactions({
		...blockData,
		transactions: transactionsSerialized.map((serialized) => ({ serialized })),
	});

	const blockFactory = app.get<Contracts.Crypto.BlockFactory>(Identifiers.Cryptography.Block.Factory);
	const block = await blockFactory.fromHex(blockSer.toString("hex"));

	// console.log(block);
	// console.log("blockSerialized: ", blockSer.toString("hex"));
};

const serializePayload = async ({ serializer }: Context) => {
	const serialized = await serializer.serializePayload(PROPOSAL.payload);
	console.log("payloadSerialized: ", serialized.toString("hex"));
};

const serializeProposal = async ({ serializer, app, factory }: Context) => {
	const serialized = await serializer.serializeProposalUnsigned(PROPOSAL.proposalDataSerializableUnsigned);

	console.log("proposalSerializedUnsigned: ", serialized.toString("hex"));

	const keyPairFactory = app.getTagged<Contracts.Crypto.KeyPairFactory>(
		Identifiers.Cryptography.Identity.KeyPair.Factory,
		"type",
		"consensus",
	);

	const keyPair = await keyPairFactory.fromMnemonic(validatorMnemonic);

	const proposal = await factory.makeProposal(PROPOSAL.proposalDataSerializableUnsigned, keyPair);

	console.log("signature: ", proposal.signature);
	console.log("proposalSerialized: ", proposal.serialized.toString("hex"));
};

const context = (await prepareSandbox({})) as Context;
await beforeEach(context);
await createBlock(context);
await serializePayload(context);
await serializeProposal(context);
