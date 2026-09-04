import type { Contracts } from "@mainsail/contracts";

import { getPrevrandao } from "@mainsail/blockchain-utils";
import { Events, Identifiers, Locale } from "@mainsail/constants";
import { inject, injectable, optional, tagged } from "@mainsail/container";
import { assert, ensureError, sleep } from "@mainsail/utils";

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

	@inject(Identifiers.Snapshot.Legacy.Importer)
	@optional()
	private readonly snapshotImporter?: Contracts.Snapshot.LegacyImporter;

	@inject(Identifiers.BlockchainUtils.FeeCalculator)
	protected readonly feeCalculator!: Contracts.BlockchainUtils.FeeCalculator;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	public async process(unit: Contracts.Processor.ProcessableUnit): Promise<Contracts.Processor.BlockProcessorResult> {
		const processResult = { feeUsed: 0n, gasUsed: 0, receipts: new Map(), success: false };

		try {
			await this.verifier.verify(unit);

			const block = unit.getBlock();
			const milestone = this.configuration.getMilestone(block.number);

			await this.evm.prepareNextCommit({
				blockContext: {
					commitKey: {
						blockHash: block.hash,
						blockNumber: BigInt(block.number),
						round: BigInt(block.round),
					},
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
				this.#consumeFee(block, processResult, transaction, Number(receipt.gasUsed));
			}

			this.#verifyConsumedAllGas(block, processResult);
			this.#verifyTotalFee(block, processResult);
			await this.#updateRewardsAndVotes(unit);
			await this.#updateValidatorRegistrationFee(unit);
			await this.#calculateRoundValidators(unit);
			await this.#verifyStateRoot(block);
			await this.#verifyLogsBloom(block);

			processResult.success = true;
		} catch (rawError) {
			const error = ensureError(rawError);
			void this.#emit(Events.BlockEvent.Invalid, { block: unit.getBlock().toData(), error });
			this.logger.error(`Cannot process block because: ${error.message}`, "consensus");
		}

		return processResult;
	}

	public async commit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (this.apiSync && unit.blockNumber > this.configuration.getGenesisHeight()) {
			await this.apiSync.flush();
		}

		const commit = await unit.getCommit();

		await this.evm.onCommit(unit);
		await this.stateStore.onCommit(unit);
		await this.databaseService.onCommit(unit);
		await this.validatorSet.onCommit(unit);

		// Run commit handlers concurrently and surface failures
		const tasks = [this.txPoolWorker.onCommit(unit), this.evmWorker.onCommit(unit)];

		if (this.apiSync && unit.blockNumber > this.configuration.getGenesisHeight()) {
			tasks.push(this.apiSync.onCommit(unit));
		}

		const results = await Promise.allSettled(tasks);
		const failures = results
			.filter((result): result is PromiseRejectedResult => result.status === "rejected")
			.map((result) => result.reason);

		if (failures.length > 0) {
			throw new AggregateError(failures, "one or more commit handlers failed");
		}

		for (const transaction of unit.getBlock().transactions) {
			void this.#emitTransactionEvents(transaction);
		}

		this.#logBlockCommitted(unit);
		this.#logNewRound(unit);

		void this.#emit(Events.BlockEvent.Applied, {
			...commit.block.toData(),
			contractEvents: unit.getContractEvents(),
		});
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
		const blockNumber = unit.getBlock().number;
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
			throw new Error("Cannot consume more gas");
		}

		processorResult.gasUsed += gasUsed;
	}

	#consumeFee(
		block: Contracts.Crypto.Block,
		processorResult: Contracts.Processor.BlockProcessorResult,
		transaction: Contracts.Crypto.BlockTransaction,
		gasUsed: number,
	): void {
		const fee = this.feeCalculator.calculateConsumed(gasUsed, BigInt(transaction.gasPrice));

		if (processorResult.feeUsed + fee > block.fee) {
			throw new Error("Cannot consume more fee");
		}

		processorResult.feeUsed += fee;
	}

	#verifyConsumedAllGas(
		block: Contracts.Crypto.Block,
		processorResult: Contracts.Processor.BlockProcessorResult,
	): void {
		if (block.gasUsed !== processorResult.gasUsed) {
			throw new Error(`Block gas ${block.gasUsed} does not match consumed gas ${processorResult.gasUsed}`);
		}
	}

	#verifyTotalFee(block: Contracts.Crypto.Block, processorResult: Contracts.Processor.BlockProcessorResult): void {
		if (processorResult.feeUsed !== block.fee) {
			throw new Error(`Block fee ${block.fee} does not match consumed fee ${processorResult.feeUsed}`);
		}
	}

	#getPrevrandao(block: Contracts.Crypto.Block): Buffer {
		if (block.number === this.configuration.getGenesisHeight()) {
			return Buffer.alloc(32);
		}

		return getPrevrandao(this.hashFactory, this.stateStore.getLastBlock());
	}

	async #verifyStateRoot(block: Contracts.Crypto.Block): Promise<void> {
		let previousStateRoot;
		if (block.number === this.configuration.getGenesisHeight()) {
			// Assume snapshot is present if the previous block points to a non-zero hash
			if (block.parentHash !== "0000000000000000000000000000000000000000000000000000000000000000") {
				assert.defined(this.snapshotImporter);
				assert.defined(this.snapshotImporter.result);
				previousStateRoot = this.snapshotImporter.snapshotHash;
			} else {
				previousStateRoot = "0000000000000000000000000000000000000000000000000000000000000000";
			}
		} else {
			const previousBlock = this.stateStore.getLastBlock();
			previousStateRoot = previousBlock.stateRoot;
		}

		const stateRoot = await this.evm.stateRoot(
			{
				blockHash: block.hash,
				blockNumber: BigInt(block.number),
				round: BigInt(block.round),
			},
			previousStateRoot,
		);

		if (block.stateRoot !== stateRoot) {
			throw new Error(`State root mismatch! ${block.stateRoot} != ${stateRoot}`);
		}
	}

	async #verifyLogsBloom(block: Contracts.Crypto.Block): Promise<void> {
		const logsBloom = await this.evm.logsBloom({
			blockHash: block.hash,
			blockNumber: BigInt(block.number),
			round: BigInt(block.round),
		});

		if (block.logsBloom !== logsBloom) {
			throw new Error(`Logs bloom mismatch! ${block.logsBloom} != ${logsBloom}`);
		}
	}

	async #emitTransactionEvents(transaction: Contracts.Crypto.Transaction): Promise<void> {
		if (this.state.isBootstrap()) {
			return;
		}

		void this.#emit(Events.TransactionEvent.Applied, transaction);
	}

	async #updateRewardsAndVotes(unit: Contracts.Processor.ProcessableUnit) {
		const milestone = this.configuration.getMilestone();
		const block = unit.getBlock();

		await this.evm.updateRewardsAndVotes({
			blockReward: BigInt(milestone.reward),
			commitKey: {
				blockHash: block.hash,
				blockNumber: BigInt(block.number),
				round: BigInt(block.round),
			},
			specId: milestone.evmSpec,
			timestamp: BigInt(block.timestamp),
			validatorAddress: block.proposer,
		});
	}

	async #updateValidatorRegistrationFee(unit: Contracts.Processor.ProcessableUnit) {
		if (!this.roundCalculator.isNewRound(unit.blockNumber + 1)) {
			return;
		}

		const { evmSpec, validatorRegistrationFee } = this.configuration.getMilestone(unit.blockNumber + 1);
		const block = unit.getBlock();

		await this.evm.updateValidatorRegistrationFee({
			commitKey: {
				blockHash: block.hash,
				blockNumber: BigInt(block.number),
				round: BigInt(block.round),
			},
			fee: BigInt(validatorRegistrationFee),
			specId: evmSpec,
			timestamp: BigInt(block.timestamp),
			validatorAddress: block.proposer,
		});
	}

	async #calculateRoundValidators(unit: Contracts.Processor.ProcessableUnit) {
		if (!this.roundCalculator.isNewRound(unit.blockNumber + 1)) {
			return;
		}

		const { evmSpec, roundValidators } = this.configuration.getMilestone(unit.blockNumber + 1);

		const block = unit.getBlock();

		await this.evm.calculateRoundValidators({
			commitKey: {
				blockHash: block.hash,
				blockNumber: BigInt(block.number),
				round: BigInt(block.round),
			},
			roundValidators: BigInt(roundValidators),
			specId: evmSpec,
			timestamp: BigInt(block.timestamp),
			validatorAddress: block.proposer,
		});
	}

	async #emit<T>(event: string, data?: T): Promise<void> {
		if (this.state.isBootstrap()) {
			return;
		}

		return this.events.dispatch(event, data);
	}
}
