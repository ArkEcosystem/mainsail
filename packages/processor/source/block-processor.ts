import type { Contracts } from "@mainsail/contracts";

import { getPrevrandao } from "@mainsail/blockchain-utils";
import { Events, Identifiers, Locale } from "@mainsail/constants";
import { inject, injectable, optional, tagged } from "@mainsail/container";
import { InvalidFee, InvalidGasUsed, InvalidLogsBloom, InvalidStateRoot } from "@mainsail/exceptions";
import { ensureError, sleep } from "@mainsail/utils";

@injectable()
export class BlockProcessor implements Contracts.Processor.BlockProcessor {
	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.State.State)
	private readonly state!: Contracts.State.State;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.BlockchainUtils.RoundCalculator)
	private readonly roundCalculator!: Contracts.BlockchainUtils.RoundCalculator;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Processor.TransactionProcessor)
	private readonly transactionProcessor!: Contracts.Processor.TransactionProcessor;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.Processor.BlockVerifier)
	private readonly verifier!: Contracts.Processor.Verifier;

	@inject(Identifiers.TransactionPool.Worker)
	private readonly txPoolWorker!: Contracts.TransactionPool.Worker;

	@inject(Identifiers.Evm.Worker)
	private readonly evmWorker!: Contracts.Evm.Worker;

	@inject(Identifiers.ApiSync.Service)
	@optional()
	private readonly apiSync?: Contracts.ApiSync.Service;

	@inject(Identifiers.BlockchainUtils.FeeCalculator)
	private readonly feeCalculator!: Contracts.BlockchainUtils.FeeCalculator;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	public async process(unit: Contracts.Processor.ProcessableUnit): Promise<Contracts.Processor.BlockProcessorResult> {
		const processResult = { feeUsed: 0n, gasUsed: 0, receipts: new Map(), success: false };
		const block = unit.getBlock();

		try {
			await this.verifier.verify(unit);

			const milestone = this.configuration.getMilestone(block.number);

			await this.evm.prepareNextCommit({
				blockContext: {
					commitKey: this.#commitKey(block),
					gasLimit: BigInt(milestone.block.maxGasLimit),
					prevrandao: this.#getPrevrandao(block),
					timestamp: BigInt(block.timestamp),
					validatorAddress: block.proposer,
				},
			});

			for (const [index, transaction] of block.transactions.entries()) {
				if (index % 20 === 0) {
					await sleep(0);
				}

				const receipt = await this.transactionProcessor.process(unit, transaction);
				processResult.receipts.set(transaction.hash, receipt);

				this.#consumeGas(block, processResult, Number(receipt.gasUsed));
				this.#consumeFee(block, processResult, transaction, receipt.gasUsed);
			}

			this.#verifyConsumedAllGas(block, processResult);
			this.#verifyTotalFee(block, processResult);
			await this.#updateRewardsAndVotes(block);

			if (this.roundCalculator.isNewRound(block.number + 1)) {
				await this.#updateValidatorRegistrationFee(block);
				await this.#calculateRoundValidators(block);
			}

			await this.#verifyStateRoot(block);
			await this.#verifyLogsBloom(block);

			processResult.success = true;
		} catch (rawError) {
			const error = ensureError(rawError);
			this.#emit(Events.BlockEvent.Invalid, { block: block.toData(), error });
			this.logger.error(`Cannot process block because: ${error.message}`, "consensus");
		}

		return processResult;
	}

	public async commit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const apiSync = this.#shouldSyncApi(unit) ? this.apiSync : undefined;

		if (apiSync) {
			await apiSync.flush();
		}

		const commit = await unit.getCommit();

		await this.evm.onCommit(unit);
		await this.stateStore.onCommit(unit);
		await this.databaseService.onCommit(unit);
		await this.validatorSet.onCommit(unit);

		// Run commit handlers concurrently and surface failures
		const tasks = [this.txPoolWorker.onCommit(unit), this.evmWorker.onCommit(unit)];

		if (apiSync) {
			tasks.push(apiSync.onCommit(unit));
		}

		const results = await Promise.allSettled(tasks);
		const failures = results
			.filter((result): result is PromiseRejectedResult => result.status === "rejected")
			.map((result) => result.reason);

		if (failures.length > 0) {
			throw new AggregateError(failures, "one or more commit handlers failed");
		}

		for (const transaction of commit.block.transactions) {
			this.#emit(Events.TransactionEvent.Applied, transaction);
		}

		this.#logBlockCommitted(unit);
		this.#logNewRound(unit);

		this.#emit(Events.BlockEvent.Applied, commit.block.toData());
	}

	#logBlockCommitted(unit: Contracts.Processor.ProcessableUnit): void {
		if (!this.state.isBootstrap()) {
			const block = unit.getBlock();

			const blockNumber = unit.blockNumber.toLocaleString(Locale);
			const round = unit.round.toLocaleString(Locale);
			const blockRound = block.round.toLocaleString(Locale);
			const transactionsCount = block.transactionsCount.toLocaleString(Locale);
			const gasUsed = block.gasUsed.toLocaleString(Locale);

			let blockString = `${blockNumber}/${round}/${block.hash}`;
			if (block.round !== unit.round) {
				blockString = `${blockNumber}/${round}(${blockRound})/${block.hash}`;
			}

			this.logger.info(
				`Committed block ${blockString} with ${transactionsCount} tx(s) (gasUsed=${gasUsed})`,
				"consensus",
			);
		}
	}

	#logNewRound(unit: Contracts.Processor.ProcessableUnit): void {
		const blockNumber = unit.blockNumber;
		if (this.roundCalculator.isNewRound(blockNumber + 1)) {
			const roundInfo = this.roundCalculator.calculateRound(blockNumber + 1);

			if (!this.state.isBootstrap()) {
				this.logger.debug(
					`Starting validator round ${roundInfo.round} at block number ${roundInfo.roundHeight} with ${roundInfo.maxValidators} validators`,
				);
			}
		}
	}

	#consumeGas(
		block: Contracts.Crypto.Block,
		processorResult: Contracts.Processor.BlockProcessorResult,
		gasUsed: number,
	): void {
		if (processorResult.gasUsed + gasUsed > block.gasUsed) {
			throw new InvalidGasUsed(block, processorResult.gasUsed + gasUsed);
		}

		processorResult.gasUsed += gasUsed;
	}

	#consumeFee(
		block: Contracts.Crypto.Block,
		processorResult: Contracts.Processor.BlockProcessorResult,
		transaction: Contracts.Crypto.BlockTransaction,
		gasUsed: bigint,
	): void {
		const fee = this.feeCalculator.calculateConsumed(transaction.gasPrice, gasUsed);

		if (processorResult.feeUsed + fee > block.fee) {
			throw new InvalidFee(block, processorResult.feeUsed + fee);
		}

		processorResult.feeUsed += fee;
	}

	#verifyConsumedAllGas(
		block: Contracts.Crypto.Block,
		processorResult: Contracts.Processor.BlockProcessorResult,
	): void {
		if (block.gasUsed !== processorResult.gasUsed) {
			throw new InvalidGasUsed(block, processorResult.gasUsed);
		}
	}

	#verifyTotalFee(block: Contracts.Crypto.Block, processorResult: Contracts.Processor.BlockProcessorResult): void {
		if (processorResult.feeUsed !== block.fee) {
			throw new InvalidFee(block, processorResult.feeUsed);
		}
	}

	#commitKey(block: Contracts.Crypto.Block): Contracts.Evm.CommitKey {
		return {
			blockHash: block.hash,
			blockNumber: BigInt(block.number),
			round: BigInt(block.round),
		};
	}

	#getPrevrandao(block: Contracts.Crypto.Block): Buffer {
		if (block.number === this.configuration.getGenesisHeight()) {
			return Buffer.alloc(32);
		}

		return getPrevrandao(this.hashFactory, this.stateStore.getLastBlock());
	}

	async #verifyStateRoot(block: Contracts.Crypto.Block): Promise<void> {
		const stateRoot = await this.evm.stateRoot(this.#commitKey(block), this.#getPreviousStateRoot(block));

		if (block.stateRoot !== stateRoot) {
			throw new InvalidStateRoot(block, stateRoot);
		}
	}

	#getPreviousStateRoot(block: Contracts.Crypto.Block): string {
		if (block.number !== this.configuration.getGenesisHeight()) {
			return this.stateStore.getLastBlock().stateRoot;
		}

		const { snapshot } = this.configuration.getMilestone(block.number);

		return snapshot?.snapshotHash ?? "0000000000000000000000000000000000000000000000000000000000000000";
	}

	async #verifyLogsBloom(block: Contracts.Crypto.Block): Promise<void> {
		const logsBloom = await this.evm.logsBloom(this.#commitKey(block));

		if (block.logsBloom !== logsBloom) {
			throw new InvalidLogsBloom(block, logsBloom);
		}
	}

	async #updateRewardsAndVotes(block: Contracts.Crypto.Block): Promise<void> {
		const milestone = this.configuration.getMilestone(block.number);

		await this.evm.updateRewardsAndVotes({
			blockReward: BigInt(milestone.reward),
			commitKey: this.#commitKey(block),
			specId: milestone.evmSpec,
			timestamp: BigInt(block.timestamp),
			validatorAddress: block.proposer,
		});
	}

	async #updateValidatorRegistrationFee(block: Contracts.Crypto.Block): Promise<void> {
		const { evmSpec, validatorRegistrationFee } = this.configuration.getMilestone(block.number + 1);

		await this.evm.updateValidatorRegistrationFee({
			commitKey: this.#commitKey(block),
			fee: BigInt(validatorRegistrationFee),
			specId: evmSpec,
			timestamp: BigInt(block.timestamp),
			validatorAddress: block.proposer,
		});
	}

	async #calculateRoundValidators(block: Contracts.Crypto.Block): Promise<void> {
		const { evmSpec, roundValidators } = this.configuration.getMilestone(block.number + 1);

		await this.evm.calculateRoundValidators({
			commitKey: this.#commitKey(block),
			roundValidators: BigInt(roundValidators),
			specId: evmSpec,
			timestamp: BigInt(block.timestamp),
			validatorAddress: block.proposer,
		});
	}

	#shouldSyncApi(unit: Contracts.Processor.ProcessableUnit): boolean {
		return this.apiSync !== undefined && unit.blockNumber > this.configuration.getGenesisHeight();
	}

	#emit<T>(event: string, data?: T): void {
		if (this.state.isBootstrap()) {
			return;
		}

		void this.events.dispatch(event, data).catch((rawError) => {
			const error = ensureError(rawError);
			this.logger.error(`Dispatching ${event} failed: ${error.stack ?? error.message}`, "consensus");
		});
	}
}
