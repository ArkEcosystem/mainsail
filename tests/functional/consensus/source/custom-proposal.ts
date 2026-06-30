import type { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Proposal } from "@mainsail/crypto-proposal";
import { assert } from "@mainsail/utils";
import { randomBytes } from "crypto";
import dayjs from "dayjs";

import type { Validator } from "./contracts.js";

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
// 1-3) replicates 'forger.forgeBlock'
// 4) replicates 'messageFactory.makeProposal'
export const makeCustomProposal = async (
	{ app, validators }: { app: Contracts.Kernel.Application; validators: Validator[] },
	transactions: Contracts.Crypto.Transaction[] = [],
): Promise<Contracts.Crypto.Proposal> => {
	const previousBlock = app.get<Contracts.State.Store>(Identifiers.State.Store).getLastBlock();

	const cryptoConfiguration = app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
	const milestone = cryptoConfiguration.getMilestone();

	const transactionHandler = app.get<Contracts.Transactions.TransactionHandler>(Identifiers.Transaction.Handler);
	const evm = app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "validator");

	// 2)
	const round = app.get<Consensus>(Identifiers.Consensus.Service).getRound();

	// 3)
	// update block buffer
	// - payloadHash
	// - payloadSize
	// - transactions
	// - amount + fee

	const totals: { amount: bigint; fee: bigint; gasUsed: number } = {
		amount: 0n,
		fee: 0n,
		gasUsed: 0,
	};

	const payloadBuffers: Buffer[] = [];
	const transactionBuffers: Buffer[] = [];

	const commitKey = {
		blockNumber: BigInt(previousBlock.number + 1),
		round: BigInt(round),
	};

	const transactionData: Contracts.Crypto.TransactionData[] = [];
	let payloadSize = 2;

	for (const transaction of transactions.values()) {
		let result = { gasRefunded: 0n, gasUsed: 0n, logs: [] as any, status: 0 };

		try {
			result = await transactionHandler.apply(
				{
					evm: {
						commitKey,
						instance: evm,
					},
				},
				transaction,
			);
		} catch {
			result = { ...result, gasUsed: BigInt(transaction.gasLimit) };
		}

		assert.string(transaction.hash);
		transactionData.push(transaction);

		totals.amount += transaction.value;
		totals.fee += BigInt(transaction.gasPrice) * result.gasUsed;
		totals.gasUsed += Number(result.gasUsed);

		payloadBuffers.push(Buffer.from(transaction.hash, "hex"));

		const buffer = Buffer.alloc(transaction.serialized.byteLength + 2);
		buffer.writeUint16LE(transaction.serialized.byteLength, 0);
		buffer.fill(transaction.serialized, 2, transaction.serialized.byteLength);
		transactionBuffers.push(buffer);

		payloadSize += transaction.serialized.byteLength + 2;
	}

	await evm.dispose();

	const hashFactory = app.get<Contracts.Crypto.HashFactory>(Identifiers.Cryptography.Hash.Factory);
	const blockFactory = app.get<Contracts.Crypto.BlockFactory>(Identifiers.Cryptography.Block.Factory);
	const block = await blockFactory.make(
		{
			fee: totals.fee,
			gasUsed: totals.gasUsed,
			logsBloom: "0".repeat(512),
			number: Number(commitKey.blockNumber),
			parentHash: previousBlock.hash,
			payloadSize,
			proposer: validators[0].address,
			reward: BigInt(milestone.reward),
			round,
			stateRoot: "0".repeat(64),
			timestamp: dayjs().valueOf(),
			transactionsCount: transactionData.length,
			transactionsRoot: hashFactory.sha256(payloadBuffers).toString("hex"),
			version: 1,
		},
		transactions,
	);

	const messageSerializer = app.get<Contracts.Crypto.ProposalSerializer>(
		Identifiers.Cryptography.Proposal.Serializer,
	);

	const proposedBytes = await messageSerializer.serializePayload({
		block,
		lockProof: undefined,
	});

	const serializedProposal = await messageSerializer.serializeProposalUnsigned({
		payloadSerialized: proposedBytes.toString("hex"),
		round,
		validatorIndex: 0,
		validRound: undefined,
	});

	const proposalSignature = await app
		.getTagged<Contracts.Crypto.SignatureBls>(Identifiers.Cryptography.Signature.Instance, "type", "consensus")
		.sign(serializedProposal, Buffer.from(validators[0].consensusPrivateKey, "hex"));

	const signedProposal = Buffer.concat([serializedProposal, Buffer.from(proposalSignature, "hex")]);

	const proposal = app.resolve(Proposal).initialize({
		blockHeader: block,
		payloadSerialized: proposedBytes.toString("hex"),
		round,
		serialized: signedProposal,
		signature: proposalSignature,
		validatorIndex: 0,
	});

	await proposal.deserializePayload();

	return proposal;
};

export const makeTransactionBuilderContext = (
	app: Contracts.Kernel.Application,
	apps: Contracts.Kernel.Application[],
	validators: Validator[],
) => {
	const context = {
		app,
		wallets: validators.map((v) => ({
			compressed: false,
			privateKey: v.privateKey,
			publicKey: v.publicKey,
		})),
	};

	return {
		...context,
		fundedWalletProvider: async (
			context: { app: Contracts.Kernel.Application; wallets: Contracts.Crypto.KeyPair[] },
			amount?: bigint,
		): Promise<Contracts.Crypto.KeyPair> => {
			// create a random wallet with funds (without sending a transaction)
			const { app } = context;

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

			// amount = amount ?? 10000000000n;

			// for (const node of nodes) {
			// 	const { walletRepository } = app
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
