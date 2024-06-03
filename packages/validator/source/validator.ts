import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber, isEmpty } from "@mainsail/utils";

@injectable()
export class Validator implements Contracts.Validator.Validator {
	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.TransactionPool.Collator)
	private readonly collator!: Contracts.TransactionPool.Collator;

	@inject(Identifiers.TransactionPool.Service)
	private readonly transactionPool!: Contracts.TransactionPool.Service;

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

		const transactions = await this.#getTransactionsForForging({ round: BigInt(round), height: BigInt(height) });
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

	async #getTransactionsForForging(
		commitKey: Contracts.Evm.CommitKey,
	): Promise<Contracts.TransactionPool.CollatorTransaction[]> {
		const transactions = await this.collator.getBlockCandidateTransactions(commitKey);

		if (isEmpty(transactions)) {
			return [];
		}

		this.logger.debug(
			`Received ${
				transactions.length
			} tx(s) from the pool containing ${this.transactionPool.getPoolSize()} tx(s) total`,
		);

		return transactions;
	}

	async #makeBlock(
		round: number,
		generatorPublicKey: string,
		transactions: Contracts.TransactionPool.CollatorTransaction[],
		timestamp: number,
	): Promise<Contracts.Crypto.Block> {
		const totals: { amount: BigNumber; fee: BigNumber; gasUsed: number } = {
			amount: BigNumber.ZERO,
			fee: BigNumber.ZERO,
			gasUsed: 0,
		};

		const payloadBuffers: Buffer[] = [];
		const transactionData: Contracts.Crypto.TransactionData[] = [];

		// The initial payload length takes the overhead for each serialized transaction into account
		// which is a uint32 per transaction to store the individual length.
		let payloadLength = transactions.length * 4;
		for (const transaction of transactions) {
			const { data, serialized, gasUsed } = transaction;
			Utils.assert.defined<string>(data.id);

			totals.amount = totals.amount.plus(data.amount);
			totals.fee = totals.fee.plus(data.fee);
			totals.gasUsed += gasUsed;

			payloadBuffers.push(Buffer.from(data.id, "hex"));
			transactionData.push(data);
			payloadLength += serialized.length;
		}

		const previousBlock = this.stateService.getStore().getLastBlock();
		const height = previousBlock.data.height + 1;
		const milestone = this.cryptoConfiguration.getMilestone(height);

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
}
