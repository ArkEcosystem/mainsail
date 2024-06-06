import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class Validator implements Contracts.Validator.Validator {
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

	@inject(Identifiers.State.Service)
	protected readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Transaction.Validator.Factory)
	private readonly createTransactionValidator!: Contracts.Transactions.TransactionValidatorFactory;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.TransactionPool.Worker)
	private readonly txPoolWorker!: Contracts.TransactionPool.Worker;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Evm.Gas.Limits)
	private readonly gasLimits!: Contracts.Evm.GasLimits;

	#keyPair!: Contracts.Validator.ValidatorKeyPair;

	public configure(keyPair: Contracts.Validator.ValidatorKeyPair): Contracts.Validator.Validator {
		this.#keyPair = keyPair;

		return this;
	}

	public getConsensusPublicKey(): string {
		return this.#keyPair.publicKey;
	}

	public async prepareBlock(
		generatorPublicKey: string,
		round: number,
		timestamp: number,
	): Promise<Contracts.Crypto.Block> {
		const previousBlock = this.stateService.getStore().getLastBlock();
		const height = previousBlock.data.height + 1;

		const transactions = await this.#getTransactionsForForging({ height: BigInt(height), round: BigInt(round) });
		return this.#makeBlock(round, generatorPublicKey, transactions, timestamp);
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
		height: number,
		round: number,
		blockId: string | undefined,
	): Promise<Contracts.Crypto.Prevote> {
		return this.messagesFactory.makePrevote(
			{
				blockId,
				height,
				round,
				type: Contracts.Crypto.MessageType.Prevote,
				validatorIndex,
			},
			await this.#keyPair.getKeyPair(),
		);
	}

	public async precommit(
		validatorIndex: number,
		height: number,
		round: number,
		blockId: string | undefined,
	): Promise<Contracts.Crypto.Precommit> {
		return this.messagesFactory.makePrecommit(
			{
				blockId,
				height,
				round,
				type: Contracts.Crypto.MessageType.Precommit,
				validatorIndex,
			},
			await this.#keyPair.getKeyPair(),
		);
	}

	async #getTransactionsForForging(commitKey: Contracts.Evm.CommitKey): Promise<Contracts.Crypto.Transaction[]> {
		const transactionBytes = await this.txPoolWorker.getTransactionBytes();

		const validator = this.createTransactionValidator();
		const candidateTransactions: Contracts.Crypto.Transaction[] = [];
		const failedTransactions: Contracts.Crypto.Transaction[] = [];

		for (const bytes of transactionBytes) {
			const transaction = await this.transactionFactory.fromBytes(bytes);

			if (failedTransactions.some((t) => t.data.senderPublicKey === transaction.data.senderPublicKey)) {
				continue;
			}

			try {
				await validator.validate(transaction);
				candidateTransactions.push(transaction);
			} catch (error) {
				this.logger.warning(`${transaction.id} failed to collate: ${error.message}`);
				failedTransactions.push(transaction);
			}
		}

		this.txPoolWorker.setFailedTransactions(failedTransactions);

		return candidateTransactions;
	}

	async #makeBlock(
		round: number,
		generatorPublicKey: string,
		transactions: Contracts.Crypto.Transaction[],
		timestamp: number,
	): Promise<Contracts.Crypto.Block> {
		const totals: { amount: BigNumber; fee: BigNumber; gasUsed: number } = {
			amount: BigNumber.ZERO,
			fee: BigNumber.ZERO,
			gasUsed: 0,
		};

		const previousBlock = this.stateService.getStore().getLastBlock();
		const height = previousBlock.data.height + 1;
		const milestone = this.cryptoConfiguration.getMilestone(height);

		const commitKey = { height: BigInt(height), round: BigInt(round) };

		const payloadBuffers: Buffer[] = [];
		const transactionData: Contracts.Crypto.TransactionData[] = [];

		// The initial payload length takes the overhead for each serialized transaction into account
		// which is a uint32 per transaction to store the individual length.
		let payloadLength = transactions.length * 4;
		for (let i = 0; i < transactions.length; i++) {
			const transaction = transactions[i];
			const { data, serialized } = transaction;

			// We received the transaction from the pool assuming they consume the maximum possible (=gas limit),
			// now calculate the actual consumption which will be less than or equal the gas limit.
			const gasUsed = await this.#calculateTransactionGasUsage(commitKey, transaction, i);
			Utils.assert.defined<string>(data.id);

			totals.amount = totals.amount.plus(data.amount);
			totals.fee = totals.fee.plus(data.fee);
			totals.gasUsed += gasUsed;

			payloadBuffers.push(Buffer.from(data.id, "hex"));
			transactionData.push(data);
			payloadLength += serialized.length;
		}

		return this.blockFactory.make({
			generatorPublicKey,
			height,
			numberOfTransactions: transactions.length,
			payloadHash: (await this.hashFactory.sha256(payloadBuffers)).toString("hex"),
			payloadLength,
			previousBlock: previousBlock.data.id,
			reward: BigNumber.make(milestone.reward),
			round,
			timestamp,
			totalAmount: totals.amount,
			totalFee: totals.fee,
			totalGasUsed: totals.gasUsed,
			transactions: transactionData,
			version: 1,
		});
	}

	async #calculateTransactionGasUsage(
		commitKey: Contracts.Evm.CommitKey,
		transaction: Contracts.Crypto.Transaction,
		sequence: number,
	): Promise<number> {
		const walletRepository = this.stateService.getStore().walletRepository;

		let gasUsed: number;

		switch (transaction.type) {
			case Contracts.Crypto.TransactionType.EvmCall: {
				Utils.assert.defined(transaction.data.asset?.evmCall);
				const { evmCall } = transaction.data.asset;
				const sender = await walletRepository.findByPublicKey(transaction.data.senderPublicKey);

				const { receipt } = await this.evm.process({
					caller: sender.getAddress(),
					commitKey,
					data: Buffer.from(evmCall.payload, "hex"),
					gasLimit: BigInt(evmCall.gasLimit),
					recipient: transaction.data.recipientId,
					sequence,
				});

				gasUsed = Number(receipt.gasUsed);
				// TODO: calculate fee as well
				break;
			}
			default: {
				gasUsed = this.gasLimits.of(transaction);
				break;
			}
		}

		return gasUsed;
	}
}
