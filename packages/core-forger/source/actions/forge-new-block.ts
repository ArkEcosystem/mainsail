import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Enums, Services, Types, Utils as AppUtils } from "@arkecosystem/core-kernel";

import { Utils } from "../utils";

@injectable()
export class ForgeNewBlockAction extends Services.Triggers.Action {
	@inject(Identifiers.Application)
	private readonly app: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.TransactionPoolCollator)
	private readonly collator!: Contracts.TransactionPool.Collator;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.TransactionPoolService)
	private readonly transactionPool!: Contracts.TransactionPool.Service;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly serializer: Contracts.Crypto.IBlockSerializer;

	@inject(Identifiers.Cryptography.Block.Deserializer)
	private readonly deserializer: Contracts.Crypto.IBlockDeserializer;

	public async execute(arguments_: Types.ActionArguments): Promise<void> {
		const validator: Contracts.Forger.Validator = arguments_.validator;
		const round: Contracts.P2P.CurrentRound = arguments_.round;
		const networkState: Contracts.P2P.NetworkState = arguments_.networkState;

		this.configuration.setHeight(networkState.getNodeHeight());

		const transactions: Contracts.Crypto.ITransactionData[] = await this.#getTransactionsForForging();

		const block: Contracts.Crypto.IBlock | undefined = await validator.forge(transactions, {
			previousBlock: {
				height: networkState.getNodeHeight(),
				id: networkState.getLastBlockId(),
			},
			reward: round.reward,
			timestamp: round.timestamp,
		});

		AppUtils.assert.defined<Contracts.Crypto.IBlock>(block);
		AppUtils.assert.defined<string>(validator.publicKey);

		const minimumMs = 2000;
		const timeLeftInMs: number = Utils.getRemainingSlotTime(round, this.configuration);
		const prettyName = `${this.app.get<object>(Identifiers.Forger.Usernames)[validator.publicKey]} (${
			validator.publicKey
		})`;

		if (timeLeftInMs >= minimumMs) {
			this.logger.info(`Forged new block ${block.data.id} by validator ${prettyName}`);

			await this.#broadcastBlock(block);

			await this.events.dispatch(Enums.BlockEvent.Forged, block.data);

			for (const transaction of transactions) {
				await this.events.dispatch(Enums.TransactionEvent.Forged, transaction);
			}
		} else if (timeLeftInMs > 0) {
			this.logger.warning(
				`Failed to forge new block by validator ${prettyName}, because there were ${timeLeftInMs}ms left in the current slot (less than ${minimumMs}ms).`,
			);
		} else {
			this.logger.warning(`Failed to forge new block by validator ${prettyName}, because already in next slot.`);
		}
	}

	async #getTransactionsForForging(): Promise<Contracts.Crypto.ITransactionData[]> {
		const transactions: Contracts.Crypto.ITransaction[] = await this.collator.getBlockCandidateTransactions();

		if (AppUtils.isEmpty(transactions)) {
			// this.logger.error("Could not get unconfirmed transactions from transaction pool.");
			return [];
		}

		this.logger.debug(
			`Received ${AppUtils.pluralize("transaction", transactions.length, true)} ` +
				`from the pool containing ${AppUtils.pluralize(
					"transaction",
					this.transactionPool.getPoolSize(),
					true,
				)} total`,
		);

		return transactions.map((transaction: Contracts.Crypto.ITransaction) => transaction.data);
	}

	async #broadcastBlock(block: Contracts.Crypto.IBlock): Promise<void> {
		const { data } = await this.deserializer.deserialize(
			await this.serializer.serializeWithTransactions({
				...block.data,
				transactions: block.transactions.map((tx) => tx.data),
			}),
		);

		await this.blockchain.handleIncomingBlock(data, true);
	}
}
