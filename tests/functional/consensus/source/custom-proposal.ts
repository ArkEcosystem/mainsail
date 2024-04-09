import { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Proposal } from "@mainsail/crypto-messages";
import { Sandbox } from "@mainsail/test-framework";

import { Validator } from "./contracts.js";

import { BigNumber } from "@mainsail/utils";
import { Utils } from "@mainsail/kernel";
import { randomBytes } from "crypto";

// To create blocks containing arbitrary transactions, the transactions have to be added
// in serialized form as the serializer could just fail e.g. due to malformed bytes etc.
//
// That's why the steps are as follows:
//
// 1) prepare (invalid) transactions in serialized form
// 2) create empty serialized block
// 3) concat with serialized transactions buffer
// 4) manually make & sign proposal
//
// 1-3) replicates 'proposer.prepareBlock'
// 4) replicates 'messageFactory.makeProposal'
export const makeCustomProposal = async (
	{ node, validators }: { node: Sandbox; validators: Validator[] },
	transactions: Contracts.Crypto.Transaction[] = [],
): Promise<Contracts.Crypto.Proposal> => {
	const proposer = node.app
		.get<Contracts.Validator.ValidatorRepository>(Identifiers.Validator.Repository)
		.getValidator(validators[0].consensusPublicKey)!;

	// 2)
	const round = node.app.get<Consensus>(Identifiers.Consensus.Service).getRound();
	const emptyBlock = await proposer.prepareBlock(validators[0].publicKey, round);

	// 3)
	// update block buffer
	// - payloadHash
	// - payloadLength
	// - transactions
	// - amount + fee
	let blockBuffer = Buffer.from(emptyBlock.serialized, "hex");

	const totals: { amount: BigNumber; fee: BigNumber } = {
		amount: BigNumber.ZERO,
		fee: BigNumber.ZERO,
	};

	const payloadBuffers: Buffer[] = [];
	const transactionBuffers: Buffer[] = [];

	let payloadLength = transactions.length * 4;
	for (const { data, serialized } of transactions) {
		Utils.assert.defined<string>(data.id);

		totals.amount = totals.amount.plus(data.amount);
		totals.fee = totals.fee.plus(data.fee);

		payloadBuffers.push(Buffer.from(data.id, "hex"));

		const buffer = Buffer.alloc(serialized.byteLength + 2);
		buffer.writeUint16LE(serialized.byteLength, 0);
		buffer.fill(serialized, 2, serialized.byteLength + 2);
		transactionBuffers.push(buffer);

		payloadLength += serialized.length;
	}

	const hashFactory = node.app.get<Contracts.Crypto.HashFactory>(Identifiers.Cryptography.Hash.Factory);
	const hashSize = node.app.get<number>(Identifiers.Cryptography.Hash.Size.SHA256);

	// numberOfTransactions
	let byteOffset = 1 + 6 + 4 + 4 + hashSize; // see headerSize
	blockBuffer.writeUint16LE(transactions.length, byteOffset);
	byteOffset += 2;

	// totalAmount
	blockBuffer.writeBigUInt64LE(totals.amount.toBigInt(), byteOffset);
	byteOffset += 8;

	// totalFee
	blockBuffer.writeBigUInt64LE(totals.fee.toBigInt(), byteOffset);
	byteOffset += 8;

	// skip reward
	byteOffset += 8;

	// payloadLength
	blockBuffer.writeUint32LE(payloadLength, byteOffset);
	byteOffset += 4;

	// payloadHash

	const payloadHash = await hashFactory.sha256(payloadBuffers);

	blockBuffer.fill(payloadHash, byteOffset, byteOffset + hashSize);
	byteOffset += hashSize;

	const generatorPublicKeySize = node.app.getTagged<number>(
		Identifiers.Cryptography.Identity.PublicKey.Size,
		"type",
		"wallet",
	);
	byteOffset += generatorPublicKeySize; // skip generatorPublicKey

	if (byteOffset !== blockBuffer.byteLength) {
		throw new Error("block not empty");
	}

	const headerSize = node.app
		.get<Contracts.Crypto.BlockSerializer>(Identifiers.Cryptography.Block.Serializer)
		.headerSize();

	if (byteOffset !== headerSize) {
		throw new Error("invalid header size");
	}

	// merge with transactions
	blockBuffer = Buffer.concat([blockBuffer, ...transactionBuffers]);

	if (
		blockBuffer.byteLength !==
		headerSize + payloadLength - /*TODO: workaround for uint32 mismatch */ 2 * transactions.length
	) {
		throw new Error("invalid block buffer size");
	}

	// 4)
	const messageSerializer = node.app.get<Contracts.Crypto.MessageSerializer>(
		Identifiers.Cryptography.Message.Serializer,
	);

	const proposedBytes = await messageSerializer.serializeProposed({
		block: {
			serialized: blockBuffer.toString("hex"),
		} as Contracts.Crypto.Block,
		lockProof: undefined,
	});

	const serializedProposal = await messageSerializer.serializeProposal(
		{
			block: { serialized: proposedBytes.toString("hex") },
			round,
			validRound: undefined,
			validatorIndex: 0,
		},
		{ includeSignature: false },
	);

	const proposalSignature = await node.app
		.getTagged<Contracts.Crypto.Signature>(Identifiers.Cryptography.Signature.Instance, "type", "consensus")
		.sign(serializedProposal, Buffer.from(validators[0].consensusPrivateKey, "hex"));

	const signedProposal = Buffer.concat([serializedProposal, Buffer.from(proposalSignature, "hex")]);

	return new Proposal({
		validatorIndex: 0,
		round,
		block: {
			// NOTE: the consensus expects a block to check the round and height.
			// but we only care about the 'serialized' field which ultimately gets broadcasted
			// to other validators.
			block: {
				...emptyBlock,
				serialized: blockBuffer.toString("hex"),
			},
			serialized: proposedBytes.toString("hex"),
		},
		height: emptyBlock.header.height,
		signature: proposalSignature,
		serialized: signedProposal,
	});
};

export const makeTransactionBuilderContext = (node: Sandbox, nodes: Sandbox[], validators: Validator[]) => {
	const context = {
		sandbox: node,
		wallets: validators.map((v) => ({
			publicKey: v.publicKey,
			privateKey: v.privateKey,
			compressed: false,
		})),
	};

	return {
		...context,
		fundedWalletProvider: async (
			context: { sandbox: Sandbox; wallets: Contracts.Crypto.KeyPair[] },
			amount?: BigNumber,
		): Promise<Contracts.Crypto.KeyPair> => {
			// create a random wallet with funds (without sending a transaction)
			const { sandbox } = context;
			const { app } = sandbox;

			const seed = randomBytes(32).toString("hex");

			const randomKeyPair = await app
				.getTagged<Contracts.Crypto.KeyPairFactory>(
					Identifiers.Cryptography.Identity.KeyPair.Factory,
					"type",
					"wallet",
				)
				.fromMnemonic(seed);

			const recipient = await app
				.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
				.fromPublicKey(randomKeyPair.publicKey);

			amount = amount ?? BigNumber.make("10000000000");

			for (const node of nodes) {
				const { walletRepository } = node.app
					.get<Contracts.State.Service>(Identifiers.State.Service)
					.getStore();
				const wallet = walletRepository.findByAddress(recipient);
				wallet.setBalance(amount);
			}

			// console.log("random funded wallet", recipient, randomKeyPair.publicKey);

			return randomKeyPair;
		},
	};
};
