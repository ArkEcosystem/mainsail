import type { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import type { Contracts } from "@mainsail/contracts";

import { getPrevrandao, randaoMessage } from "@mainsail/blockchain-utils";
import { Identifiers } from "@mainsail/constants";
import { Proposal } from "@mainsail/crypto-proposal";
import { assert } from "@mainsail/utils";
import { randomBytes } from "crypto";
import dayjs from "dayjs";

import type { Validator } from "./contracts.js";

export type BlockOverrides = Partial<Parameters<Contracts.Crypto.BlockFactory["make"]>[0]>;

// Builds the proposal of the slot-0 validator for the next block, with the given transactions and header
// overrides. It mirrors BlockForger.forgeBlock, with two differences that let a test play a misbehaving
// proposer: the transactions bypass the pool, so the block can carry transactions the pool would refuse
// (a failing transaction stays in the block and is charged its gas limit), and any header field can be
// replaced afterwards, so the block can lie about its contents. Without overrides and with valid
// transactions the block is valid.
export const makeCustomProposal = async (
	{ app, validators }: { app: Contracts.Kernel.Application; validators: Validator[] },
	transactions: Contracts.Crypto.Transaction[] = [],
	overrides: BlockOverrides = {},
): Promise<Contracts.Crypto.Proposal> => {
	const stateStore = app.get<Contracts.State.Store>(Identifiers.State.Store);
	const previousBlock = stateStore.getLastBlock();
	const blockNumber = previousBlock.number + 1;

	const configuration = app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
	const milestone = configuration.getMilestone(blockNumber);
	const hashFactory = app.get<Contracts.Crypto.HashFactory>(Identifiers.Cryptography.Hash.Factory);
	const roundCalculator = app.get<Contracts.BlockchainUtils.RoundCalculator>(
		Identifiers.BlockchainUtils.RoundCalculator,
	);

	const proposer = validators[0];
	const round = app.get<Consensus>(Identifiers.Consensus.Service).getRound();
	const timestamp = dayjs().valueOf();
	const commitKey: Contracts.Evm.CommitKey = { blockNumber: BigInt(blockNumber), round: BigInt(round) };

	// The validator instance is the one the forger uses; its pending commit is dropped again below.
	const evm = app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "validator");

	let gasUsed = 0;
	let fee = 0n;
	let logsBloom: string;
	let stateRoot: string;

	try {
		await evm.initializeGenesis(app.get<Contracts.Evm.GenesisInfo>(Identifiers.EvmConsensus.GenesisInfo));
		await evm.prepareNextCommit({
			blockContext: {
				commitKey,
				gasLimit: BigInt(milestone.block.maxGasLimit),
				prevrandao: getPrevrandao(hashFactory, previousBlock),
				timestamp: BigInt(timestamp),
				validatorAddress: proposer.address,
			},
		});

		for (const transaction of transactions) {
			let transactionGasUsed = BigInt(transaction.gasLimit);

			try {
				const { receipt } = await evm.process({
					commitKey,
					data: Buffer.from(transaction.data.slice(2), "hex"),
					from: transaction.from,
					gasLimit: BigInt(transaction.gasLimit),
					gasPrice: BigInt(transaction.gasPrice),
					legacyAddress: transaction.senderLegacyAddress,
					nonce: transaction.nonce,
					specId: milestone.evmSpec,
					to: transaction.to,
					txHash: transaction.hash,
					value: transaction.value,
				});

				transactionGasUsed = receipt.gasUsed;
			} catch {
				// The transaction cannot be executed. A proposer that skipped validation would still include it.
			}

			gasUsed += Number(transactionGasUsed);
			fee += BigInt(transaction.gasPrice) * transactionGasUsed;
		}

		await evm.updateRewardsAndVotes({
			blockReward: BigInt(milestone.reward),
			commitKey,
			specId: milestone.evmSpec,
			timestamp: BigInt(timestamp),
			validatorAddress: proposer.address,
		});

		if (roundCalculator.isNewRound(blockNumber + 1)) {
			const nextMilestone = configuration.getMilestone(blockNumber + 1);

			await evm.updateValidatorRegistrationFee({
				commitKey,
				fee: BigInt(nextMilestone.validatorRegistrationFee),
				specId: nextMilestone.evmSpec,
				timestamp: BigInt(timestamp),
				validatorAddress: proposer.address,
			});

			await evm.calculateRoundValidators({
				commitKey,
				roundValidators: BigInt(nextMilestone.roundValidators),
				specId: nextMilestone.evmSpec,
				timestamp: BigInt(timestamp),
				validatorAddress: proposer.address,
			});
		}

		logsBloom = await evm.logsBloom(commitKey);
		stateRoot = await evm.stateRoot(commitKey, previousBlock.stateRoot);
	} finally {
		await evm.dispose();
	}

	const payloadBuffers: Buffer[] = [];
	let payloadSize = transactions.length * 4;

	for (const transaction of transactions) {
		assert.string(transaction.hash);

		payloadBuffers.push(Buffer.from(transaction.hash, "hex"));
		payloadSize += transaction.serialized.length;
	}

	const randaoReveal = await app
		.getTagged<Contracts.Crypto.SignatureBls>(Identifiers.Cryptography.Signature.Instance, "type", "consensus")
		.sign(
			randaoMessage(stateStore.getGenesisCommit().block.hash, previousBlock.randaoReveal, blockNumber),
			Buffer.from(proposer.consensusPrivateKey, "hex"),
		);

	const block = await app.get<Contracts.Crypto.BlockFactory>(Identifiers.Cryptography.Block.Factory).make(
		{
			fee,
			gasUsed,
			logsBloom,
			number: blockNumber,
			parentHash: previousBlock.hash,
			payloadSize,
			proposer: proposer.address,
			randaoReveal,
			reward: BigInt(milestone.reward),
			round,
			stateRoot,
			timestamp,
			transactionsCount: transactions.length,
			transactionsRoot: hashFactory.sha256(payloadBuffers).toString("hex"),
			version: 1,
			...overrides,
		},
		transactions,
	);

	// Signed by hand rather than through Validator.propose, so that the proposal is built and signed whatever
	// the block contains.
	const proposalSerializer = app.get<Contracts.Crypto.ProposalSerializer>(
		Identifiers.Cryptography.Proposal.Serializer,
	);

	const payloadSerialized = (await proposalSerializer.serializePayload({ block, lockProof: undefined })).toString(
		"hex",
	);

	const proposalUnsigned = await proposalSerializer.serializeProposalUnsigned({
		payloadSerialized,
		round,
		validatorIndex: 0,
		validRound: undefined,
	});

	const signature = await app
		.getTagged<Contracts.Crypto.SignatureBls>(Identifiers.Cryptography.Signature.Instance, "type", "consensus")
		.sign(proposalUnsigned, Buffer.from(proposer.consensusPrivateKey, "hex"));

	const proposal = app.resolve(Proposal).initialize({
		blockHeader: block,
		payloadSerialized,
		round,
		serialized: Buffer.concat([proposalUnsigned, Buffer.from(signature, "hex")]),
		signature,
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
