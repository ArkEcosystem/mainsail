import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber, isEmpty, pluralize } from "@mainsail/utils";

import { Proposal } from "./proposal";

@injectable()
export class Validator {
	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@inject(Identifiers.TransactionPoolCollator)
	private readonly collator!: Contracts.TransactionPool.Collator;

	@inject(Identifiers.TransactionPoolService)
	private readonly transactionPool!: Contracts.TransactionPool.Service;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.Cryptography.HashFactory)
	private readonly hashFactory: Contracts.Crypto.IHashFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Database.Service)
	private readonly database: Contracts.Database.IDatabaseService;

	@inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots: Contracts.Crypto.Slots;

	#keyPair: Contracts.Crypto.IKeyPair;

	public configure(keyPair: Contracts.Crypto.IKeyPair): Validator {
		this.#keyPair = keyPair;

		return this;
	}

	public getPublicKey(): string {
		return this.#keyPair.publicKey;
	}

	public async prepareBlock(height: number, round: number): Promise<Contracts.Crypto.IBlock> {
		const transactions = await this.#getTransactionsForForging();
		return this.#forge(transactions);
	}

	public async propose(height: number, round: number, block: Contracts.Crypto.IBlock): Promise<Proposal> {
		return new Proposal(height, round, block, this.#keyPair.publicKey, "signature");
	}

	async #getTransactionsForForging(): Promise<Contracts.Crypto.ITransactionData[]> {
		const transactions: Contracts.Crypto.ITransaction[] = await this.collator.getBlockCandidateTransactions();

		if (isEmpty(transactions)) {
			return [];
		}

		this.logger.debug(
			`Received ${pluralize("transaction", transactions.length, true)} ` +
				`from the pool containing ${pluralize("transaction", this.transactionPool.getPoolSize(), true)} total`,
		);

		return transactions.map((transaction: Contracts.Crypto.ITransaction) => transaction.data);
	}

	async #forge(transactions: Contracts.Crypto.ITransactionData[]): Promise<Contracts.Crypto.IBlock> {
		const totals: { amount: BigNumber; fee: BigNumber } = {
			amount: BigNumber.ZERO,
			fee: BigNumber.ZERO,
		};

		const payloadBuffers: Buffer[] = [];
		for (const transaction of transactions) {
			Utils.assert.defined<string>(transaction.id);

			totals.amount = totals.amount.plus(transaction.amount);
			totals.fee = totals.fee.plus(transaction.fee);

			payloadBuffers.push(Buffer.from(transaction.id, "hex"));
		}

		const previousBlock = await this.database.getLastBlock();

		return this.blockFactory.make(
			{
				generatorPublicKey: this.#keyPair.publicKey,
				height: previousBlock.data.height + 1,
				numberOfTransactions: transactions.length,
				payloadHash: (await this.hashFactory.sha256(payloadBuffers)).toString("hex"),
				payloadLength: 32 * transactions.length,
				previousBlock: previousBlock.data.id,
				reward: this.cryptoConfiguration.getMilestone().reward,
				timestamp: this.slots.getTime(),
				totalAmount: totals.amount,
				totalFee: totals.fee,
				transactions,
				version: 1,
			},
			this.#keyPair,
		);
	}
}
