import { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Proposal } from "@mainsail/crypto-messages";
import { Sandbox } from "@mainsail/test-framework";
import { assert, BigNumber } from "@mainsail/utils";
import { randomBytes } from "crypto";
import dayjs from "dayjs";

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
	const previousBlock = node.app.get<Contracts.State.Store>(Identifiers.State.Store).getLastBlock();

	const cryptoConfiguration = node.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
	const milestone = cryptoConfiguration.getMilestone();

	const transactionValidatorFactory = node.app.get<Contracts.Transactions.TransactionValidatorFactory>(
		Identifiers.Transaction.Validator.Factory,
	);
	const transactionValidator = transactionValidatorFactory();

	// 2)
	const round = node.app.get<Consensus>(Identifiers.Consensus.Service).getRound();

	// 3)
	// update block buffer
	// - payloadHash
	// - payloadSize
	// - transactions
	// - amount + fee

	const totals: { amount: BigNumber; fee: BigNumber; gasUsed: number } = {
		amount: BigNumber.ZERO,
		fee: BigNumber.ZERO,
		gasUsed: 0,
	};

	const payloadBuffers: Buffer[] = [];
	const transactionBuffers: Buffer[] = [];

	const commitKey = {
		blockNumber: BigInt(previousBlock.header.number + 1),
		round: BigInt(round),
	};

	const transactionData: Contracts.Crypto.TransactionData[] = [];
	let payloadSize = transactions.length * 2;

	for (const transaction of transactions) {
		let result = { gasUsed: 0 };

		try {
			result = await transactionValidator.validate(
				{
					commitKey,
					gasLimit: milestone.block.maxGasLimit,
					generatorAddress: validators[0].publicKey,
					timestamp: dayjs().valueOf(),
				},
				transaction,
			);
		} catch {
			result = { gasUsed: transaction.data.gasLimit };
		}

		const { data, serialized } = transaction;
		assert.string(data.hash);

		transactionData.push(data);

		totals.amount = totals.amount.plus(data.value);
		totals.fee = totals.fee.plus(BigNumber.make(data.gasPrice).times(result.gasUsed));
		totals.gasUsed += result.gasUsed;

		payloadBuffers.push(Buffer.from(data.hash, "hex"));

		const buffer = Buffer.alloc(serialized.byteLength + 2);
		buffer.writeUint16LE(serialized.byteLength, 0);
		buffer.fill(serialized, 2, serialized.byteLength + 2);
		transactionBuffers.push(buffer);

		payloadSize += serialized.length;
	}

	const hashFactory = node.app.get<Contracts.Crypto.HashFactory>(Identifiers.Cryptography.Hash.Factory);
	const blockFactory = node.app.get<Contracts.Crypto.BlockFactory>(Identifiers.Cryptography.Block.Factory);
	const block = await blockFactory.make(
		{
			fee: totals.fee,
			gasUsed: totals.gasUsed,
			logsBloom: "0".repeat(64),
			number: Number(commitKey.blockNumber),
			parentHash: previousBlock.header.hash,
			payloadSize,
			proposer: validators[0].address,
			reward: BigNumber.make(milestone.reward),
			round,
			stateRoot: "0".repeat(64),
			timestamp: dayjs().valueOf(),
			transactions: transactionData,
			transactionsCount: transactionData.length,
			transactionsRoot: (await hashFactory.sha256(payloadBuffers)).toString("hex"),
			version: 1,
		},
		transactions,
	);

	const messageSerializer = node.app.get<Contracts.Crypto.MessageSerializer>(
		Identifiers.Cryptography.Message.Serializer,
	);

	const proposedBytes = await messageSerializer.serializeProposed({
		block,
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

	const proposal = node.app.resolve(Proposal).initialize({
		blockNumber: block.header.number,
		dataSerialized: proposedBytes.toString("hex"),
		round,
		serialized: signedProposal,
		signature: proposalSignature,
		validatorIndex: 0,
	});

	await proposal.deserializeData();

	return proposal;
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

			// const recipient = await app
			// 	.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
			// 	.fromPublicKey(randomKeyPair.publicKey);

			// amount = amount ?? BigNumber.make("10000000000");

			// for (const node of nodes) {
			// 	const { walletRepository } = node.app
			// 		.get<Contracts.State.Store>(Identifiers.State.Store)
			// 		.getStore();
			// 	const wallet = walletRepository.findByAddress(recipient);
			// 	wallet.setBalance(amount);
			// }

			// console.log("random funded wallet", recipient, randomKeyPair.publicKey);

			return randomKeyPair;
		},
	};
};
