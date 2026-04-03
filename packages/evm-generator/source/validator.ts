import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { inject } from "@mainsail/container";
import { Identifiers as EvmConsensusIdentifiers } from "@mainsail/evm-consensus";
import { assert, BigNumber } from "@mainsail/utils";

export class Validator implements Contracts.Validator.Validator {
	@inject(Identifiers.State.Store)
	protected readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Cryptography.Proposal.Serializer)
	private readonly proposalSerializer!: Contracts.Crypto.ProposalSerializer;

	@inject(Identifiers.Cryptography.Proposal.Factory)
	private readonly proposalFactory!: Contracts.Crypto.ProposalFactory;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	@inject(Identifiers.Transaction.Validator.Factory)
	private readonly createTransactionValidator!: Contracts.Transactions.TransactionValidatorFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly messageFactory!: Contracts.Crypto.MessageFactory;

	@inject(EvmConsensusIdentifiers.Internal.GenesisInfo)
	private readonly genesisInfo!: Contracts.Evm.GenesisInfo;

	@inject(Identifiers.BlockchainUtils.RoundCalculator)
	private readonly roundCalculator!: Contracts.BlockchainUtils.RoundCalculator;

	#keyPair!: Contracts.Validator.ValidatorKeyPair;

	public configure(keyPair: Contracts.Validator.ValidatorKeyPair): Contracts.Validator.Validator {
		this.#keyPair = keyPair;
		return this;
	}

	public getConsensusPublicKey(): string {
		return this.#keyPair.publicKey;
	}

	public async prepareBlock(
		generatorAddress: string,
		round: number,
		timestamp: number,
	): Promise<Contracts.Crypto.Block> {
		const previousBlock = this.stateStore.getLastBlock();
		const blockNumber = previousBlock.number + 1;

		const { fee, gasUsed, logsBloom, stateRoot, transactions } = await this.#getTransactionsForForging(
			generatorAddress,
			timestamp,
			{
				blockNumber: BigInt(blockNumber),
				round: BigInt(round),
			},
		);
		return this.#makeBlock(round, generatorAddress, logsBloom, stateRoot, transactions, timestamp, gasUsed, fee);
	}

	public async propose(
		validatorIndex: number,
		round: number,
		validRound: number | undefined,
		block: Contracts.Crypto.Block,
		lockProof?: Contracts.Crypto.AggregatedSignature,
	): Promise<Contracts.Crypto.Proposal> {
		const serializedProposedData = await this.proposalSerializer.serializePayload({ block, lockProof });
		return this.proposalFactory.makeProposal(
			{
				payloadSerialized: serializedProposedData.toString("hex"),
				round,
				validatorIndex,
				validRound,
			},
			await this.#keyPair.getKeyPair(),
		);
	}

	public async prevote(
		validatorIndex: number,
		blockNumber: number,
		round: number,
		blockHash: string | undefined,
	): Promise<Contracts.Crypto.Message> {
		throw new Error("Method not implemented.");
	}

	public async precommit(
		validatorIndex: number,
		blockNumber: number,
		round: number,
		blockHash: string | undefined,
	): Promise<Contracts.Crypto.Message> {
		return this.messageFactory.makeMessage(
			{
				blockHash,
				blockNumber,
				round,
				type: Enums.Crypto.MessageType.Precommit,
				validatorIndex,
			},
			await this.#keyPair.getKeyPair(),
		);
	}

	async #getTransactionsForForging(
		generatorAddress: string,
		timestamp: number,
		commitKey: Contracts.Evm.CommitKey,
	): Promise<{
		logsBloom: string;
		stateRoot: string;
		transactions: Contracts.Crypto.Transaction[];
		gasUsed: number;
		fee: BigNumber;
	}> {
		const validator = this.createTransactionValidator();
		const evm = validator.getEvm();

		try {
			await evm.initializeGenesis(this.genesisInfo);
			await evm.prepareNextCommit({ commitKey });

			const transactions: Contracts.Crypto.Transaction[] = [];

			const previousBlock = this.stateStore.getLastBlock();
			const milestone = this.cryptoConfiguration.getMilestone();
			// let gasLeft = milestone.block.maxGasLimit;
			let gasUsed = 0;
			let fee = BigNumber.ZERO;

			await evm.updateRewardsAndVotes({
				blockReward: BigNumber.make(milestone.reward).toBigInt(),
				commitKey,
				specId: milestone.evmSpec,
				timestamp: BigInt(timestamp),
				validatorAddress: generatorAddress,
			});

			if (this.roundCalculator.isNewRound(previousBlock.number + 2)) {
				const { roundValidators } = this.cryptoConfiguration.getMilestone(previousBlock.number + 2);

				await evm.calculateRoundValidators({
					commitKey,
					roundValidators: BigNumber.make(roundValidators).toBigInt(),
					specId: milestone.evmSpec,
					timestamp: BigInt(timestamp),
					validatorAddress: generatorAddress,
				});
			}

			const logsBloom = await evm.logsBloom(commitKey);
			const stateRoot = await evm.stateRoot(commitKey, previousBlock.stateRoot);

			return {
				fee,
				gasUsed,
				logsBloom,
				stateRoot,
				transactions: transactions,
			};
		} finally {
			await evm.dispose();
		}
	}

	async #makeBlock(
		round: number,
		proposer: string,
		logsBloom: string,
		stateRoot: string,
		transactions: Contracts.Crypto.Transaction[],
		timestamp: number,
		gasUsed: number,
		fee: BigNumber,
	): Promise<Contracts.Crypto.Block> {
		const previousBlock = this.stateStore.getLastBlock();
		const number = previousBlock.number + 1;
		const milestone = this.cryptoConfiguration.getMilestone(number);

		const payloadBuffers: Buffer[] = [];
		const transactionData: Contracts.Crypto.TransactionData[] = [];

		// The payload length needs to account for the overhead of each serialized transaction
		// which is a uint32 per transaction to store the individual length.
		let payloadSize = transactions.length * 4;

		for (const transaction of transactions) {
			assert.string(transaction.hash);

			payloadBuffers.push(Buffer.from(transaction.hash, "hex"));
			transactionData.push(transaction.toData());
			payloadSize += transaction.serialized.length;
		}

		return this.blockFactory.make(
			{
				fee,
				gasUsed,
				logsBloom,
				number,
				parentHash: previousBlock.hash,
				payloadSize,
				proposer,
				reward: BigNumber.make(milestone.reward),
				round,
				stateRoot,
				timestamp,
				transactionsCount: transactionData.length,
				transactionsRoot: this.hashFactory.sha256(payloadBuffers).toString("hex"),
				version: 1,
			},
			transactions,
		);
	}
}
