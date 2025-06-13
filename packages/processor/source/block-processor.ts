import { inject, injectable, optional, tagged } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";
import { assert, BigNumber, sleep } from "@mainsail/utils";

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

	@inject(Identifiers.Transaction.Handler.Registry)
	private handlerRegistry!: Contracts.Transactions.TransactionHandlerRegistry;

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

	public async process(unit: Contracts.Processor.ProcessableUnit): Promise<Contracts.Processor.BlockProcessorResult> {
		const processResult = { gasUsed: 0, receipts: new Map(), success: false };

		try {
			await this.verifier.verify(unit);

			const block = unit.getBlock();

			await this.evm.prepareNextCommit({
				commitKey: {
					blockHash: block.header.hash,
					blockNumber: BigInt(block.header.number),
					round: BigInt(block.header.round),
				},
			});

			for (const [index, transaction] of block.transactions.entries()) {
				if (index % 20 === 0) {
					await sleep(0);
				}

				const receipt = await this.transactionProcessor.process(unit, transaction);
				processResult.receipts.set(transaction.hash, receipt);

				transaction.data.gasUsed = Number(receipt.gasUsed);
				this.#consumeGas(block, processResult, Number(receipt.gasUsed));
			}

			this.#verifyConsumedAllGas(block, processResult);
			this.#verifyTotalFee(block);
			await this.#updateRewardsAndVotes(unit);
			await this.#calculateRoundValidators(unit);
			await this.#verifyStateRoot(block);
			await this.#verifyLogsBloom(block);

			processResult.success = true;
		} catch (error) {
			void this.#emit(Events.BlockEvent.Invalid, { block: unit.getBlock().data, error });
			this.logger.error(`Cannot process block because: ${error.message}`);
		}

		return processResult;
	}

	public async commit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (this.apiSync && unit.blockNumber > this.configuration.getGenesisHeight()) {
			await this.apiSync.beforeCommit();
		}

		const commit = await unit.getCommit();

		await this.evm.onCommit(unit);
		await this.stateStore.onCommit(unit);
		await this.databaseService.onCommit(unit);
		await this.validatorSet.onCommit(unit);
		await this.txPoolWorker.onCommit(unit);
		await this.evmWorker.onCommit(unit);

		if (this.apiSync && unit.blockNumber > this.configuration.getGenesisHeight()) {
			await this.apiSync.onCommit(unit);
		}

		for (const transaction of unit.getBlock().transactions) {
			await this.#emitTransactionEvents(transaction);
		}

		this.#logBlockCommitted(unit);
		this.#logNewRound(unit);

		void this.#emit(Events.BlockEvent.Applied, commit.block.data);
	}

	#logBlockCommitted(unit: Contracts.Processor.ProcessableUnit): void {
		if (!this.state.isBootstrap()) {
			const block = unit.getBlock();
			this.logger.info(
				`Block ${unit.blockNumber.toLocaleString()}/${unit.round.toLocaleString()} with ${block.data.transactionsCount.toLocaleString()} tx(s) committed (gasUsed=${block.data.gasUsed.toLocaleString()})`,
			);
		}
	}

	#logNewRound(unit: Contracts.Processor.ProcessableUnit): void {
		const blockNumber = unit.getBlock().data.number;
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
		const totalGas = block.header.gasUsed;

		if (processorResult.gasUsed + gasUsed > totalGas) {
			throw new Error("Cannot consume more gas");
		}

		processorResult.gasUsed += gasUsed;
	}

	#verifyConsumedAllGas(
		block: Contracts.Crypto.Block,
		processorResult: Contracts.Processor.BlockProcessorResult,
	): void {
		const totalGas = block.header.gasUsed;
		if (totalGas !== processorResult.gasUsed) {
			throw new Error(`Block gas ${totalGas} does not match consumed gas ${processorResult.gasUsed}`);
		}
	}

	#verifyTotalFee(block: Contracts.Crypto.Block): void {
		let totalGas = BigNumber.ZERO;
		for (const transaction of block.transactions) {
			assert.defined(transaction.data.gasUsed);

			totalGas = totalGas.plus(
				this.feeCalculator.calculateConsumed(transaction.data.gasUsed, transaction.data.gasPrice),
			);
		}

		if (!totalGas.isEqualTo(block.header.fee)) {
			throw new Error(`Block fee ${block.header.fee} does not match consumed fee ${totalGas}`);
		}
	}

	async #verifyStateRoot(block: Contracts.Crypto.Block): Promise<void> {
		let previousStateRoot;
		if (block.header.number === this.configuration.getGenesisHeight()) {
			// Assume snapshot is present if the previous block points to a non-zero hash
			if (block.header.parentHash !== "0000000000000000000000000000000000000000000000000000000000000000") {
				assert.defined(this.snapshotImporter);
				assert.defined(this.snapshotImporter.result);
				previousStateRoot = this.snapshotImporter.snapshotHash;
			} else {
				previousStateRoot = "0000000000000000000000000000000000000000000000000000000000000000";
			}
		} else {
			const previousBlock = this.stateStore.getLastBlock();
			previousStateRoot = previousBlock.header.stateRoot;
		}

		const stateRoot = await this.evm.stateRoot(
			{
				blockHash: block.header.hash,
				blockNumber: BigInt(block.header.number),
				round: BigInt(block.header.round),
			},
			previousStateRoot,
		);

		if (block.header.stateRoot !== stateRoot) {
			throw new Error(`State root mismatch! ${block.header.stateRoot} != ${stateRoot}`);
		}
	}

	async #verifyLogsBloom(block: Contracts.Crypto.Block): Promise<void> {
		const logsBloom = await this.evm.logsBloom({
			blockHash: block.header.hash,
			blockNumber: BigInt(block.header.number),
			round: BigInt(block.header.round),
		});

		if (block.header.logsBloom !== logsBloom) {
			throw new Error(`Logs bloom mismatch! ${block.header.logsBloom} != ${logsBloom}`);
		}
	}

	async #emitTransactionEvents(transaction: Contracts.Crypto.Transaction): Promise<void> {
		if (this.state.isBootstrap()) {
			return;
		}

		void this.#emit(Events.TransactionEvent.Applied, transaction.data);
		const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);
		handler.emitEvents(transaction);
	}

	async #updateRewardsAndVotes(unit: Contracts.Processor.ProcessableUnit) {
		const milestone = this.configuration.getMilestone();
		const block = unit.getBlock();

		await this.evm.updateRewardsAndVotes({
			blockReward: BigNumber.make(milestone.reward).toBigInt(),
			commitKey: {
				blockHash: block.header.hash,
				blockNumber: BigInt(block.header.number),
				round: BigInt(block.header.round),
			},
			specId: milestone.evmSpec,
			timestamp: BigInt(block.header.timestamp),
			validatorAddress: block.header.proposer,
		});
	}

	async #calculateRoundValidators(unit: Contracts.Processor.ProcessableUnit) {
		if (!this.roundCalculator.isNewRound(unit.blockNumber + 1)) {
			return;
		}

		const { roundValidators, evmSpec } = this.configuration.getMilestone(unit.blockNumber + 1);

		const block = unit.getBlock();

		await this.evm.calculateRoundValidators({
			commitKey: {
				blockHash: block.header.hash,
				blockNumber: BigInt(block.header.number),
				round: BigInt(block.header.round),
			},
			roundValidators: BigNumber.make(roundValidators).toBigInt(),
			specId: evmSpec,
			timestamp: BigInt(block.header.timestamp),
			validatorAddress: block.header.proposer,
		});
	}

	async #emit<T>(event: Contracts.Kernel.EventName, data?: T): Promise<void> {
		if (this.state.isBootstrap()) {
			return;
		}

		return this.events.dispatch(event, data);
	}
}
