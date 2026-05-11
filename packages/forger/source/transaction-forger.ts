import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { Identifiers as EvmConsensusIdentifiers } from "@mainsail/evm-consensus";
import { performance } from "perf_hooks";

import { TransactionIterable } from "./transaction-iterable.js";

@injectable()
export class TransactionForger implements Contracts.Forger.TransactionForger {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "forger")
	private readonly pluginConfiguration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.State.Store)
	protected readonly stateStore!: Contracts.State.Store;

	@inject(EvmConsensusIdentifiers.Internal.GenesisInfo)
	private readonly genesisInfo!: Contracts.Evm.GenesisInfo;

	@inject(Identifiers.BlockchainUtils.RoundCalculator)
	private readonly roundCalculator!: Contracts.BlockchainUtils.RoundCalculator;

	@inject(Identifiers.Transaction.Validator.Factory)
	private readonly createTransactionValidator!: Contracts.Transactions.TransactionValidatorFactory;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.TransactionPool.Worker)
	private readonly txPoolWorker!: Contracts.TransactionPool.Worker;

	@inject(Identifiers.BlockchainUtils.FeeCalculator)
	protected readonly gasFeeCalculator!: Contracts.BlockchainUtils.FeeCalculator;

	#generatorAddress!: string;
	#timestamp!: number;
	#commitKey!: Contracts.Evm.CommitKey;
	#validator!: Contracts.Transactions.TransactionValidator;
	#evm!: Contracts.Evm.Instance;
	#milestone!: Contracts.Crypto.Milestone;
	#previousBlock!: Contracts.Crypto.Block;
	#timeLimit!: number;

	#failedSenders: Set<string> = new Set();


	public initialize(
		generatorAddress: string,
		timestamp: number,
		commitKey: Contracts.Evm.CommitKey,
	): TransactionForger {
		this.#generatorAddress = generatorAddress;
		this.#timestamp = timestamp;
		this.#commitKey = commitKey;

		this.#validator = this.createTransactionValidator();
		this.#evm = this.#validator.getEvm();

		this.#milestone = this.cryptoConfiguration.getMilestone();
		this.#previousBlock = this.stateStore.getLastBlock();

		// txCollatorFactor% of the time for block preparation, the rest is for  block and proposal serialization and signing
		this.#timeLimit =
			performance.now() +
			this.#milestone.timeouts.blockPrepareTime *
				this.pluginConfiguration.getRequired<number>("txCollatorFactor");

		return this;
	}

	public async getTransactions(): Promise<{
		logsBloom: string;
		stateRoot: string;
		transactions: Contracts.Crypto.Transaction[];
		gasUsed: number;
		fee: bigint;
	}> {
		try {
			await this.#evm.initializeGenesis(this.genesisInfo);
			await this.#evm.prepareNextCommit({ commitKey: this.#commitKey });

			const { fee, gasUsed, transactions } = await this.#processTransactions();

			await this.#updateRewardsAndVotes();
			await this.#calculateRoundValidators();

			return {
				fee,
				gasUsed,
				logsBloom: await this.#evm.logsBloom(this.#commitKey),
				stateRoot: await this.#evm.stateRoot(this.#commitKey, this.#previousBlock.stateRoot),
				transactions,
			};
		} finally {
			await this.#evm.dispose();
		}
	}

	async #processTransactions(): Promise<{
		fee: bigint;
		gasUsed: number;
		transactions: Contracts.Crypto.Transaction[];
	}> {
		const transactions: Contracts.Crypto.Transaction[] = [];

		let gasLeft = this.#milestone.block.maxGasLimit;
		let gasUsed = 0;
		let fee = 0n;

		const transactionIterable = this.app
			.resolve<TransactionIterable>(TransactionIterable)
			.initialize(this.#commitKey);

		for await (const transaction of transactionIterable) {
			if (performance.now() > this.#timeLimit) {
				break;
			}

			if (this.#failedSenders.has(transaction.senderPublicKey)) {
				continue;
			}

			try {
				if (gasLeft < 21000) {
					break;
				}

				let optimisticExecution = false;

				const gasLimit = transaction.gasLimit;
				if (gasLeft - gasLimit < 0) {
					// Optimistically execute transaction even if the gas limit exceeds the remaining
					// block space since there's possibly still space to fit the actual gas consumed.

					// If the consumed gas exceeds the remaining block space, we ignore the transaction and
					// calculate the root from the previous state (rollback).
					optimisticExecution = true;
					this.logger.info(
						`attempting optimistic execution of tx ${transaction.hash} (tx.gas=${gasLimit} gasLeft=${gasLeft})`,
					);

					await this.#evm.snapshot(this.#commitKey);
				}

				const result = await this.#validateTransaction(transaction);

				gasLeft -= Number(result.gasUsed);

				// Ignore transaction if it uses more than what's left.
				if (gasLeft < 0) {
					this.logger.warn(
						`skipping tx ${transaction.hash} due to insufficient block space (tx.gasUsed=${Number(result.gasUsed)} gasLeft=${gasLeft} optimistic=${optimisticExecution})`,
					);

					if (optimisticExecution) {
						await this.#evm.rollback(this.#commitKey);
					}

					break;
				}

				gasUsed += Number(result.gasUsed);
				fee += this.gasFeeCalculator.calculateConsumed(transaction.gasPrice, result.gasUsed);
				transactions.push(transaction);
			} catch (error) {
				await this.#handleFailedTransaction(transaction, error as Error);
			}
		}

		return { fee, gasUsed, transactions };
	}

	async #validateTransaction(transaction: Contracts.Crypto.Transaction): Promise<Contracts.Evm.TransactionReceipt> {
		return this.#validator.validate(
			{
				commitKey: this.#commitKey,
				gasLimit: this.#milestone.block.maxGasLimit,
				generatorAddress: this.#generatorAddress,
				timestamp: this.#timestamp,
			},
			transaction,
		);
	}

	async #handleFailedTransaction(transaction: Contracts.Crypto.Transaction, error: Error): Promise<void> {
		this.logger.warn(`tx ${transaction.hash} from ${transaction.from} failed to collate: ${error.message}`);

		await this.txPoolWorker.removeTransaction(transaction.from, transaction.hash);
		this.#failedSenders.add(transaction.senderPublicKey);
	}

	async #updateRewardsAndVotes(): Promise<void> {
		await this.#evm.updateRewardsAndVotes({
			blockReward: BigInt(this.#milestone.reward),
			commitKey: this.#commitKey,
			specId: this.#milestone.evmSpec,
			timestamp: BigInt(this.#timestamp),
			validatorAddress: this.#generatorAddress,
		});
	}

	async #calculateRoundValidators(): Promise<void> {
		if (this.roundCalculator.isNewRound(this.#previousBlock.number + 2)) {
			const { roundValidators } = this.cryptoConfiguration.getMilestone(this.#previousBlock.number + 2);

			await this.#evm.calculateRoundValidators({
				commitKey: this.#commitKey,
				roundValidators: BigInt(roundValidators),
				specId: this.#milestone.evmSpec,
				timestamp: BigInt(this.#timestamp),
				validatorAddress: this.#generatorAddress,
			});
		}
	}
}
