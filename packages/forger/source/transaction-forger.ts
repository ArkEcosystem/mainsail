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
	#timestamp!: number
	#commitKey!: Contracts.Evm.CommitKey;

	public initialize(
		generatorAddress: string,
		timestamp: number,
		commitKey: Contracts.Evm.CommitKey
	): TransactionForger {
		this.#generatorAddress = generatorAddress;
		this.#timestamp = timestamp;
		this.#commitKey = commitKey;

		return this;
	}

	async getTransactions(): Promise<{
		logsBloom: string;
		stateRoot: string;
		transactions: Contracts.Crypto.Transaction[];
		gasUsed: number;
		fee: bigint;
	}> {
		const validator = this.createTransactionValidator();
		const evm = validator.getEvm();

		try {
			await evm.initializeGenesis(this.genesisInfo);
			await evm.prepareNextCommit({ commitKey: this.#commitKey });

			const candidateTransactions: Contracts.Crypto.Transaction[] = [];
			const failedSenders: Set<string> = new Set();

			const previousBlock = this.stateStore.getLastBlock();
			const milestone = this.cryptoConfiguration.getMilestone();
			let gasLeft = milestone.block.maxGasLimit;
			let gasUsed = 0;
			let fee = 0n;

			// txCollatorFactor% of the time for block preparation, the rest is for  block and proposal serialization and signing
			const timeLimit =
				performance.now() +
				milestone.timeouts.blockPrepareTime * this.pluginConfiguration.getRequired<number>("txCollatorFactor");

			const transactionIterable = this.app
				.resolve<TransactionIterable>(TransactionIterable)
				.initialize(this.#commitKey);

			for await (const transaction of transactionIterable) {
				if (performance.now() > timeLimit) {
					break;
				}

				if (failedSenders.has(transaction.senderPublicKey)) {
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

						await evm.snapshot(this.#commitKey);
					}

					const result = await validator.validate(
						{ commitKey: this.#commitKey, gasLimit: milestone.block.maxGasLimit, generatorAddress: this.#generatorAddress, timestamp: this.#timestamp },
						transaction,
					);

					gasLeft -= Number(result.gasUsed);

					// Ignore transaction if it uses more than what's left.
					if (gasLeft < 0) {
						this.logger.warn(
							`skipping tx ${transaction.hash} due to insufficient block space (tx.gasUsed=${Number(result.gasUsed)} gasLeft=${gasLeft} optimistic=${optimisticExecution})`,
						);

						if (optimisticExecution) {
							await evm.rollback(this.#commitKey);
						}

						break;
					}

					gasUsed += Number(result.gasUsed);
					fee += this.gasFeeCalculator.calculateConsumed(transaction.gasPrice, result.gasUsed);
					candidateTransactions.push(transaction);
				} catch (error) {
					this.logger.warn(
						`tx ${transaction.hash} from ${transaction.from} failed to collate: ${error.message}`,
					);

					await this.txPoolWorker.removeTransaction(transaction.from, transaction.hash);

					failedSenders.add(transaction.senderPublicKey);
				}
			}

			await evm.updateRewardsAndVotes({
				blockReward: BigInt(milestone.reward),
				commitKey: this.#commitKey,
				specId: milestone.evmSpec,
				timestamp: BigInt(this.#timestamp),
				validatorAddress: this.#generatorAddress,
			});

			if (this.roundCalculator.isNewRound(previousBlock.number + 2)) {
				const { roundValidators } = this.cryptoConfiguration.getMilestone(previousBlock.number + 2);

				await evm.calculateRoundValidators({
					commitKey: this.#commitKey,
					roundValidators: BigInt(roundValidators),
					specId: milestone.evmSpec,
					timestamp: BigInt(this.#timestamp),
					validatorAddress: this.#generatorAddress,
				});
			}

			return {
				fee,
				gasUsed,
				logsBloom: await evm.logsBloom(this.#commitKey),
				stateRoot: await evm.stateRoot(this.#commitKey, previousBlock.stateRoot),
				transactions: candidateTransactions,
			};
		} finally {
			await evm.dispose();
		}
	}
}
