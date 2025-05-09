import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Identifiers as EvmConsensusIdentifiers } from "@mainsail/evm-consensus";
import { Providers } from "@mainsail/kernel";
import { assert, BigNumber } from "@mainsail/utils";
import { performance } from "perf_hooks";

@injectable()
export class Validator implements Contracts.Validator.Validator {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "validator")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(EvmConsensusIdentifiers.Internal.GenesisInfo)
	private readonly genesisInfo!: Contracts.Evm.GenesisInfo;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly messageSerializer!: Contracts.Crypto.MessageSerializer;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly messagesFactory!: Contracts.Crypto.MessageFactory;

	@inject(Identifiers.BlockchainUtils.RoundCalculator)
	private readonly roundCalculator!: Contracts.BlockchainUtils.RoundCalculator;

	@inject(Identifiers.State.Store)
	protected readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.Transaction.Validator.Factory)
	private readonly createTransactionValidator!: Contracts.Transactions.TransactionValidatorFactory;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.TransactionPool.Worker)
	private readonly txPoolWorker!: Contracts.TransactionPool.Worker;

	@inject(Identifiers.BlockchainUtils.FeeCalculator)
	protected readonly gasFeeCalculator!: Contracts.BlockchainUtils.FeeCalculator;

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
		const blockNumber = previousBlock.header.number + 1;

		const {
			logsBloom,
			stateRoot: stateHash,
			transactions,
		} = await this.#getTransactionsForForging(generatorAddress, timestamp, {
			blockNumber: BigInt(blockNumber),
			round: BigInt(round),
		});
		return this.#makeBlock(round, generatorAddress, logsBloom, stateHash, transactions, timestamp);
	}

	public async propose(
		validatorIndex: number,
		round: number,
		validRound: number | undefined,
		block: Contracts.Crypto.Block,
		lockProof?: Contracts.Crypto.AggregatedSignature,
	): Promise<Contracts.Crypto.Proposal> {
		const serializedProposedBlock = await this.messageSerializer.serializeProposed({ block, lockProof });
		return this.messagesFactory.makeProposal(
			{
				data: { serialized: serializedProposedBlock.toString("hex") },
				round,
				validRound,
				validatorIndex,
			},
			await this.#keyPair.getKeyPair(),
		);
	}

	public async prevote(
		validatorIndex: number,
		blockNumber: number,
		round: number,
		blockHash: string | undefined,
	): Promise<Contracts.Crypto.Prevote> {
		return this.messagesFactory.makePrevote(
			{
				blockHash,
				blockNumber,
				round,
				type: Contracts.Crypto.MessageType.Prevote,
				validatorIndex,
			},
			await this.#keyPair.getKeyPair(),
		);
	}

	public async precommit(
		validatorIndex: number,
		blockNumber: number,
		round: number,
		blockHash: string | undefined,
	): Promise<Contracts.Crypto.Precommit> {
		return this.messagesFactory.makePrecommit(
			{
				blockHash,
				blockNumber,
				round,
				type: Contracts.Crypto.MessageType.Precommit,
				validatorIndex,
			},
			await this.#keyPair.getKeyPair(),
		);
	}

	async #getTransactionsForForging(
		generatorAddress: string,
		timestamp: number,
		commitKey: Contracts.Evm.CommitKey,
	): Promise<{ logsBloom: string; stateRoot: string; transactions: Contracts.Crypto.Transaction[] }> {
		const transactionBytes = await this.txPoolWorker.getTransactionBytes();

		const validator = this.createTransactionValidator();
		const evm = validator.getEvm();

		try {
			await evm.initializeGenesis(this.genesisInfo);
			await evm.prepareNextCommit({ commitKey });

			const candidateTransactions: Contracts.Crypto.Transaction[] = [];
			const failedSenders: Set<string> = new Set();

			const previousBlock = this.stateStore.getLastBlock();
			const milestone = this.cryptoConfiguration.getMilestone();
			let gasLeft = milestone.block.maxGasLimit;

			// txCollatorFactor% of the time for block preparation, the rest is for  block and proposal serialization and signing
			const timeLimit =
				performance.now() +
				milestone.timeouts.blockPrepareTime * this.configuration.getRequired<number>("txCollatorFactor");

			for (const bytes of transactionBytes) {
				if (performance.now() > timeLimit) {
					break;
				}

				const transaction = await this.transactionFactory.fromBytes(bytes);
				transaction.data.transactionIndex = candidateTransactions.length;

				if (failedSenders.has(transaction.data.senderPublicKey)) {
					continue;
				}

				try {
					if (gasLeft < 21000) {
						break;
					}

					let optimisticExecution = false;

					const gas = transaction.data.gas;
					if (gasLeft - gas < 0) {
						// Optimistically execute transaction even if the gas limit exceeds the remaining
						// block space since there's possibly still space to fit the actual gas consumed.

						// If the consumed gas exceeds the remaining block space, we ignore the transaction and
						// calculate the root from the previous state (rollback).
						optimisticExecution = true;
						this.logger.info(
							`attempting optimistic execution of tx ${transaction.hash} (tx.gas=${gas} gasLeft=${gasLeft})`,
						);

						await evm.snapshot(commitKey);
					}

					const result = await validator.validate(
						{ commitKey, gasLimit: milestone.block.maxGasLimit, generatorAddress, timestamp },
						transaction,
					);

					gasLeft -= Number(result.gasUsed);

					// Ignore transaction if it uses more than what's left.
					if (gasLeft < 0) {
						this.logger.warning(
							`skipping tx ${transaction.hash} due to insufficient block space (tx.gasUsed=${Number(result.gasUsed)} gasLeft=${gasLeft} optimistic=${optimisticExecution})`,
						);

						if (optimisticExecution) {
							await evm.rollback(commitKey);
						}

						break;
					}

					transaction.data.gasUsed = Number(result.gasUsed);
					candidateTransactions.push(transaction);
				} catch (error) {
					this.logger.warning(
						`tx ${transaction.hash} from ${transaction.data.from} failed to collate: ${error.message}`,
					);

					await this.txPoolWorker.removeTransaction(transaction.data.from, transaction.hash);

					failedSenders.add(transaction.data.senderPublicKey);
				}
			}

			await evm.updateRewardsAndVotes({
				blockReward: BigNumber.make(milestone.reward).toBigInt(),
				commitKey,
				specId: milestone.evmSpec,
				timestamp: BigInt(timestamp),
				validatorAddress: generatorAddress,
			});

			if (this.roundCalculator.isNewRound(previousBlock.header.number + 2)) {
				const { activeValidators } = this.cryptoConfiguration.getMilestone(previousBlock.header.number + 2);

				await evm.calculateActiveValidators({
					activeValidators: BigNumber.make(activeValidators).toBigInt(),
					commitKey,
					specId: milestone.evmSpec,
					timestamp: BigInt(timestamp),
					validatorAddress: generatorAddress,
				});
			}

			const logsBloom = await evm.logsBloom(commitKey);
			const stateRoot = await evm.stateHash(commitKey, previousBlock.header.stateRoot);

			return {
				logsBloom,
				stateRoot,
				transactions: candidateTransactions,
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
	): Promise<Contracts.Crypto.Block> {
		const previousBlock = this.stateStore.getLastBlock();
		const number = previousBlock.header.number + 1;
		const milestone = this.cryptoConfiguration.getMilestone(number);

		const totals: { amount: BigNumber; fee: BigNumber; gasUsed: number } = {
			amount: BigNumber.ZERO,
			fee: BigNumber.ZERO,
			gasUsed: 0,
		};
		const payloadBuffers: Buffer[] = [];
		const transactionData: Contracts.Crypto.TransactionData[] = [];

		// The payload length needs to account for the overhead of each serialized transaction
		// which is a uint32 per transaction to store the individual length.
		let payloadSize = transactions.length * 4;

		for (const transaction of transactions) {
			const { data, serialized } = transaction;
			assert.string(data.hash);
			assert.number(data.gasUsed);

			totals.amount = totals.amount.plus(data.value);
			assert.number(data.gasUsed);
			totals.fee = totals.fee.plus(this.gasFeeCalculator.calculateConsumed(data.gasPrice, data.gasUsed));
			totals.gasUsed += data.gasUsed;

			payloadBuffers.push(Buffer.from(data.hash, "hex"));
			transactionData.push(data);
			payloadSize += serialized.length;
		}

		return this.blockFactory.make(
			{
				amount: totals.amount,
				fee: totals.fee,
				gasUsed: totals.gasUsed,
				logsBloom,
				number,
				parentHash: previousBlock.header.hash,
				payloadSize,
				proposer,
				reward: BigNumber.make(milestone.reward),
				round,
				stateRoot,
				timestamp,
				transactions: transactionData,
				transactionsCount: transactionData.length,
				transactionsRoot: (await this.hashFactory.sha256(payloadBuffers)).toString("hex"),
				version: 1,
			},
			transactions,
		);
	}
}
