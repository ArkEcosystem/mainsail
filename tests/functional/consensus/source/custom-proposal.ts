import { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Proposal } from "@mainsail/crypto-messages";
import { Utils } from "@mainsail/kernel";
import { Sandbox } from "@mainsail/test-framework";
import { BigNumber } from "@mainsail/utils";
import { randomBytes } from "crypto";
import { ethers } from "ethers";

import { Validator } from "./contracts.js";

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

	const stateService = node.app.get<Contracts.State.Service>(Identifiers.State.Service);
	const previousBlock = stateService.getStore().getLastBlock();

	const cryptoConfiguration = node.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
	const milestone = cryptoConfiguration.getMilestone();

	const transactionValidatorFactory = node.app.get<Contracts.Transactions.TransactionValidatorFactory>(
		Identifiers.Transaction.Validator.Factory,
	);
	const transactionValidator = transactionValidatorFactory();

	// 2)
	const round = node.app.get<Consensus>(Identifiers.Consensus.Service).getRound();
	const emptyBlock = await proposer.prepareBlock(validators[0].publicKey, round, Date.now());

	// 3)
	// update block buffer
	// - payloadHash
	// - payloadLength
	// - transactions
	// - amount + fee
	let blockBuffer = Buffer.from(emptyBlock.serialized, "hex");

	const totals: { amount: BigNumber; fee: BigNumber; gasUsed: number } = {
		amount: BigNumber.ZERO,
		fee: BigNumber.ZERO,
		gasUsed: 0,
	};

	const payloadBuffers: Buffer[] = [];
	const transactionBuffers: Buffer[] = [];

	const commitKey = {
		height: BigInt(emptyBlock.header.height),
		round: BigInt(round),
	};

	let payloadLength = transactions.length * 2;
	for (const transaction of transactions) {
		let result = { gasUsed: 0 };

		try {
			result = await transactionValidator.validate(
				{
					commitKey,
					gasLimit: milestone.block.maxGasLimit,
					generatorPublicKey: validators[0].publicKey,
					timestamp: emptyBlock.header.timestamp,
				},
				transaction,
			);
		} catch (ex) {
			const gasLimits = node.app.get<Contracts.Evm.GasLimits>(Identifiers.Evm.Gas.Limits);
			result = { gasUsed: gasLimits.of(transaction) };
		}

		const { data, serialized } = transaction;
		Utils.assert.defined<string>(data.id);

		totals.amount = totals.amount.plus(data.amount);
		totals.fee = totals.fee.plus(data.fee);
		totals.gasUsed += result.gasUsed;

		payloadBuffers.push(Buffer.from(data.id, "hex"));

		const buffer = Buffer.alloc(serialized.byteLength + 2);
		buffer.writeUint16LE(serialized.byteLength, 0);
		buffer.fill(serialized, 2, serialized.byteLength + 2);
		transactionBuffers.push(buffer);

		payloadLength += serialized.length;
	}

	const stateHash = await transactionValidator.getEvm().stateHash(commitKey, previousBlock.header.stateHash);

	const hashFactory = node.app.get<Contracts.Crypto.HashFactory>(Identifiers.Cryptography.Hash.Factory);
	const hashSize = node.app.get<number>(Identifiers.Cryptography.Hash.Size.SHA256);

	let byteOffset = 1 + 6 + 4 + 4 + hashSize; // see headerSize

	// stateHash
	Buffer.from(stateHash, "hex").copy(blockBuffer, byteOffset);
	byteOffset += hashSize;

	// numberOfTransactions
	blockBuffer.writeUint16LE(transactions.length, byteOffset);
	byteOffset += 2;

	// totalGasUsed
	blockBuffer.writeUInt32LE(totals.gasUsed, byteOffset);
	byteOffset += 4;

	// totalAmount
	const amountBuffer = toUint256Buffer(totals.amount);
	amountBuffer.copy(blockBuffer, byteOffset);
	byteOffset += 32;

	// totalFee
	const feeBuffer = toUint256Buffer(totals.fee);
	feeBuffer.copy(blockBuffer, byteOffset);
	byteOffset += 32;

	// skip reward
	byteOffset += 32;

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

	if (blockBuffer.byteLength !== headerSize + payloadLength) {
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
			data: { serialized: proposedBytes.toString("hex") },
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

	return node.app.resolve(Proposal).initialize({
		dataSerialized: proposedBytes.toString("hex"),
		height: emptyBlock.header.height,
		round,
		serialized: signedProposal,
		signature: proposalSignature,
		validatorIndex: 0,
	});
};

export const makeTransactionBuilderContext = (node: Sandbox, nodes: Sandbox[], validators: Validator[]) => {
	const context = {
		sandbox: node,
		wallets: validators.map((v) => ({
			compressed: false,
			privateKey: v.privateKey,
			publicKey: v.publicKey,
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

const toUint256Buffer = (amount: BigNumber): Buffer => {
	const bytes = ethers.toBeArray(BigNumber.make(amount).toBigInt());
	if (bytes.byteLength > 32) {
		throw new Error("value must fit into uint256");
	}

	const padded = ethers.zeroPadValue(bytes, 32);

	return Buffer.from(ethers.getBytes(padded));
};
