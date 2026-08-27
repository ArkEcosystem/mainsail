import type { Contracts } from "@mainsail/contracts";

import { getPrevrandao } from "@mainsail/blockchain-utils";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";
import { performance } from "perf_hooks";

import { TransactionIterable } from "./transaction-iterable.js";

type ProcessTransactionResult = {
	fee: bigint;
	gasUsed: number;
	transactions: Contracts.Crypto.Transaction[];
	gasLeft: number;
};

@injectable()
export class TransactionForger implements Contracts.Forger.TransactionForger {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "forger")
	private readonly pluginConfiguration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "validator")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	@inject(Identifiers.State.Store)
	protected readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.EvmConsensus.GenesisInfo)
	private readonly genesisInfo!: Contracts.Evm.GenesisInfo;

	@inject(Identifiers.BlockchainUtils.RoundCalculator)
	private readonly roundCalculator!: Contracts.BlockchainUtils.RoundCalculator;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.TransactionPool.Worker)
	private readonly txPoolWorker!: Contracts.TransactionPool.Worker;

	@inject(Identifiers.BlockchainUtils.FeeCalculator)
	protected readonly gasFeeCalculator!: Contracts.BlockchainUtils.FeeCalculator;

	#generatorAddress!: string;
	#timestamp!: number;
	#commitKey!: Contracts.Evm.CommitKey;
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
			await this.evm.initializeGenesis(this.genesisInfo);
			await this.evm.prepareNextCommit({
				blockContext: {
					commitKey: this.#commitKey,
					gasLimit: BigInt(this.#milestone.block.maxGasLimit),
					prevrandao: getPrevrandao(this.hashFactory, this.#previousBlock),
					timestamp: BigInt(this.#timestamp),
					validatorAddress: this.#generatorAddress,
				},
			});

			const { fee, gasUsed, transactions } = await this.#processTransactions();

			await this.#updateRewardsAndVotes();
			await this.#updateValidatorRegistrationFee();
			await this.#calculateRoundValidators();

			return {
				fee,
				gasUsed,
				logsBloom: await this.evm.logsBloom(this.#commitKey),
				stateRoot: await this.evm.stateRoot(this.#commitKey, this.#previousBlock.stateRoot),
				transactions,
			};
		} finally {
			await this.evm.dispose();
		}
	}

	async #processTransactions(): Promise<ProcessTransactionResult> {
		const result: ProcessTransactionResult = {
			fee: 0n,
			gasLeft: this.#milestone.block.maxGasLimit,
			gasUsed: 0,
			transactions: [] as Contracts.Crypto.Transaction[],
		};

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

			if (result.gasLeft < 21000) {
				break;
			}

			await this.#processTransaction(transaction, result);
		}

		return result;
	}

	async #processTransaction(
		transaction: Contracts.Crypto.Transaction,
		result: ProcessTransactionResult,
	): Promise<void> {
		const optimisticExecution = result.gasLeft - transaction.gasLimit < 0;
		let snapshotTaken = false;

		try {
			if (optimisticExecution) {
				// Optimistically execute transaction even if the gas limit exceeds the remaining
				// block space since there's possibly still space to fit the actual gas consumed.

				// If the consumed gas exceeds the remaining block space, we ignore the transaction and
				// calculate the root from the previous state (rollback).
				this.logger.info(
					`attempting optimistic execution of tx ${transaction.hash} (tx.gas=${transaction.gasLimit} gasLeft=${result.gasLeft})`,
				);

				await this.evm.snapshot(this.#commitKey);
				snapshotTaken = true;
			}

			const validation = await this.#validateTransaction(transaction);
			// Reduce gas left even for optimistic executions, to prevent further processing.
			const gasUsed = Number(validation.gasUsed);
			result.gasLeft -= gasUsed;

			if (result.gasLeft < 0) {
				this.logger.warn(
					`Skipping tx ${transaction.hash} due to insufficient block space (tx.gasUsed=${gasUsed} gasLeft=${transaction.gasLimit} optimistic=${optimisticExecution})`,
				);

				if (snapshotTaken) {
					await this.evm.rollback(this.#commitKey);
					return;
				} else {
					// In practice, this should never happen since the validator should reject transactions that exceed the block gas limit, but we check just in case.
					throw new Error(
						`Non-optimistic transaction processing requires more gas than remaining block space (tx.gasUsed=${gasUsed} gasLeft=${transaction.gasLimit})`,
					);
				}
			}

			result.gasUsed += gasUsed;
			result.fee += this.gasFeeCalculator.calculateConsumed(transaction.gasPrice, validation.gasUsed);
			result.transactions.push(transaction);
		} catch (rawError) {
			const error = ensureError(rawError);

			// Ensure unexpected errors keep the evm in a consistent state.
			if (snapshotTaken) {
				try {
					await this.evm.rollback(this.#commitKey);
				} catch (innerError) {
					this.logger.warn(
						`rollback failed after failed tx ${transaction.hash}: ${ensureError(innerError).message}`,
					);
				}
			}

			await this.#handleFailedTransaction(transaction, error as Error);
		}
	}

	async #validateTransaction(transaction: Contracts.Crypto.Transaction): Promise<Contracts.Evm.TransactionReceipt> {
		const { receipt } = await this.evm.process({
			commitKey: this.#commitKey,
			data: Buffer.from(transaction.data.slice(2), "hex"),
			from: transaction.from,
			gasLimit: BigInt(transaction.gasLimit),
			gasPrice: BigInt(transaction.gasPrice),
			legacyAddress: transaction.senderLegacyAddress,
			nonce: transaction.nonce,
			specId: this.cryptoConfiguration.getMilestone().evmSpec,
			to: transaction.to,
			txHash: transaction.hash,
			value: transaction.value,
		});

		return receipt;
	}

	async #handleFailedTransaction(transaction: Contracts.Crypto.Transaction, error: Error): Promise<void> {
		this.logger.warn(`tx ${transaction.hash} from ${transaction.from} failed to collate: ${error.message}`);

		await this.txPoolWorker.removeTransaction(transaction.from, transaction.hash);
		this.#failedSenders.add(transaction.senderPublicKey);
	}

	async #updateRewardsAndVotes(): Promise<void> {
		await this.evm.updateRewardsAndVotes({
			blockReward: BigInt(this.#milestone.reward),
			commitKey: this.#commitKey,
			specId: this.#milestone.evmSpec,
			timestamp: BigInt(this.#timestamp),
			validatorAddress: this.#generatorAddress,
		});
	}

	async #updateValidatorRegistrationFee(): Promise<void> {
		if (this.roundCalculator.isNewRound(this.#previousBlock.number + 2)) {
			const { evmSpec, validatorRegistrationFee } = this.cryptoConfiguration.getMilestone(
				this.#previousBlock.number + 2,
			);

			await this.evm.updateValidatorRegistrationFee({
				commitKey: this.#commitKey,
				fee: BigInt(validatorRegistrationFee),
				specId: evmSpec,
				timestamp: BigInt(this.#timestamp),
				validatorAddress: this.#generatorAddress,
			});
		}
	}

	async #calculateRoundValidators(): Promise<void> {
		if (this.roundCalculator.isNewRound(this.#previousBlock.number + 2)) {
			const { evmSpec, roundValidators } = this.cryptoConfiguration.getMilestone(this.#previousBlock.number + 2);

			await this.evm.calculateRoundValidators({
				commitKey: this.#commitKey,
				roundValidators: BigInt(roundValidators),
				specId: evmSpec,
				timestamp: BigInt(this.#timestamp),
				validatorAddress: this.#generatorAddress,
			});
		}
	}
}
