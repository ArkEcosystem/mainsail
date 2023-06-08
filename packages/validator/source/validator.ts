import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber, isEmpty, pluralize } from "@mainsail/utils";

@injectable()
export class Validator implements Contracts.Consensus.IValidator {
	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.TransactionPoolCollator)
	private readonly collator!: Contracts.TransactionPool.Collator;

	@inject(Identifiers.TransactionPoolService)
	private readonly transactionPool!: Contracts.TransactionPool.Service;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.Cryptography.HashFactory)
	private readonly hashFactory!: Contracts.Crypto.IHashFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Database.Service)
	private readonly database!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots!: Contracts.Crypto.Slots;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly messagesFactory!: Contracts.Crypto.IMessageFactory;

	#keyPair!: Contracts.Crypto.IKeyPair;
	#walletPublicKey!: string;

	public configure(publicKey: string, keyPair: Contracts.Crypto.IKeyPair): Contracts.Consensus.IValidator {
		this.#walletPublicKey = publicKey;
		this.#keyPair = keyPair;

		return this;
	}

	public getConsensusPublicKey(): string {
		return this.#keyPair.publicKey;
	}

	public async prepareBlock(height: number, round: number): Promise<Contracts.Crypto.IBlock> {
		// TODO: use height/round ?
		const transactions = await this.#getTransactionsForForging();
		return this.#forge(transactions);
	}

	public async propose(
		height: number,
		round: number,
		block: Contracts.Crypto.IBlock,
		validRound: number | undefined,
	): Promise<Contracts.Crypto.IProposal> {
		return this.messagesFactory.makeProposal(
			{ block, height, round, validRound, validatorPublicKey: this.#keyPair.publicKey },
			this.#keyPair,
		);
	}

	public async prevote(
		height: number,
		round: number,
		blockId: string | undefined,
	): Promise<Contracts.Crypto.IPrevote> {
		return this.messagesFactory.makePrevote(
			{ blockId, height, round, validatorPublicKey: this.#keyPair.publicKey },
			this.#keyPair,
		);
	}

	public async precommit(
		height: number,
		round: number,
		blockId: string | undefined,
	): Promise<Contracts.Crypto.IPrecommit> {
		return this.messagesFactory.makePrecommit(
			{ blockId, height, round, validatorPublicKey: this.#keyPair.publicKey },
			this.#keyPair,
		);
	}

	async #getTransactionsForForging(): Promise<Contracts.Crypto.ITransaction[]> {
		const transactions: Contracts.Crypto.ITransaction[] = await this.collator.getBlockCandidateTransactions();

		if (isEmpty(transactions)) {
			return [];
		}

		this.logger.debug(
			`Received ${pluralize("transaction", transactions.length, true)} ` +
			`from the pool containing ${pluralize("transaction", this.transactionPool.getPoolSize(), true)} total`,
		);

		return transactions;
	}

	async #forge(transactions: Contracts.Crypto.ITransaction[]): Promise<Contracts.Crypto.IBlock> {
		const totals: { amount: BigNumber; fee: BigNumber } = {
			amount: BigNumber.ZERO,
			fee: BigNumber.ZERO,
		};

		const payloadBuffers: Buffer[] = [];
		const transactionData: Contracts.Crypto.ITransactionData[] = [];
		let payloadLength = transactions.length * 4;
		for (const { data, serialized } of transactions) {
			Utils.assert.defined<string>(data.id);

			totals.amount = totals.amount.plus(data.amount);
			totals.fee = totals.fee.plus(data.fee);

			payloadBuffers.push(Buffer.from(data.id, "hex"));
			transactionData.push(data);
			payloadLength += serialized.length;
		}

		const previousBlock = await this.database.getLastBlock();
		Utils.assert.defined<Contracts.Crypto.IBlock>(previousBlock);

		return this.blockFactory.make({
			generatorPublicKey: this.#walletPublicKey,
			height: previousBlock.data.height + 1,
			numberOfTransactions: transactions.length,
			payloadHash: (await this.hashFactory.sha256(payloadBuffers)).toString("hex"),
			payloadLength,
			previousBlock: previousBlock.data.id,
			reward: BigNumber.make(this.cryptoConfiguration.getMilestone().reward),
			timestamp: this.slots.getTime(),
			totalAmount: totals.amount,
			totalFee: totals.fee,
			transactions: transactionData,
			version: 1,
		});
	}
}
