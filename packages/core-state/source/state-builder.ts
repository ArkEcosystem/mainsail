import { inject, injectable, tagged } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Application, Enums, Utils as AppUtils } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";
import lmdb from "lmdb";

// todo: review the implementation
@injectable()
export class StateBuilder {
	@inject(Identifiers.Application)
	private readonly app!: Application;

	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.DposState)
	@tagged("state", "blockchain")
	private dposState!: Contracts.State.DposState;

	@inject(Identifiers.EventDispatcherService)
	private events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.Database.BlockStorage)
	private readonly blockStorage: lmdb.Database;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	public async run(): Promise<void> {
		this.events = this.app.get<Contracts.Kernel.EventDispatcher>(Identifiers.EventDispatcherService);

		const registeredHandlers = this.app
			.getTagged<Contracts.Transactions.ITransactionHandlerRegistry>(
				Identifiers.TransactionHandlerRegistry,
				"state",
				"blockchain",
			)
			.getRegisteredHandlers();
		const steps = registeredHandlers.length + 3;

		for (const { value } of this.blockStorage.getRange({})) {
			const { data, transactions } = await this.blockFactory.fromBytes(value);

			try {
				this.logger.info(`State Generation - Step 1 of ${steps}: Block Rewards`);
				await this.buildBlockRewards(data);

				this.logger.info(`State Generation - Step 2 of ${steps}: Fees & Nonces`);
				await this.buildSentTransactions(transactions);

				const capitalize = (key: string) => key[0].toUpperCase() + key.slice(1);
				for (const [index, handler] of registeredHandlers.entries()) {
					const ctorKey: string | undefined = handler.getConstructor().key;
					const version = handler.getConstructor().version;
					AppUtils.assert.defined<string>(ctorKey);

					this.logger.info(
						`State Generation - Step ${3 + index} of ${steps}: ${capitalize(ctorKey)} v${version}`,
					);
					await handler.bootstrap(transactions);
				}

				this.logger.info(`State Generation - Step ${steps} of ${steps}: Vote Balances & Validator Ranking`);
				this.dposState.buildVoteBalances();
				this.dposState.buildValidatorRanking();

				this.logger.info(
					`Number of registered validators: ${Object.keys(
						this.walletRepository.allByUsername(),
					).length.toLocaleString()}`,
				);

				this.verifyWalletsConsistency();

				await this.events.dispatch(Enums.StateEvent.BuilderFinished);
			} catch (error) {
				this.logger.error(error.stack);
			}
		}
	}

	private async buildBlockRewards(block: Contracts.Crypto.IBlockData): Promise<void> {
		const wallet = await this.walletRepository.findByPublicKey(block.generatorPublicKey);
		wallet.increaseBalance(BigNumber.make(block.reward));
	}

	private async buildSentTransactions(transactions: Contracts.Crypto.ITransaction[]): Promise<void> {
		for (const { data: transaction } of transactions) {
			const wallet = await this.walletRepository.findByPublicKey(transaction.senderPublicKey);
			wallet.setNonce(BigNumber.make(transaction.nonce));
			wallet.decreaseBalance(BigNumber.make(transaction.amount).plus(transaction.fee));
		}
	}

	private verifyWalletsConsistency(): void {
		const logNegativeBalance = (wallet, type, balance) =>
			this.logger.warning(`Wallet ${wallet.address} has a negative ${type} of '${balance}'`);

		const genesisPublicKeys: Record<string, true> = Object.fromEntries(
			this.configuration.get("genesisBlock.transactions").map((current) => [current.senderPublicKey, true]),
		);

		for (const wallet of this.walletRepository.allByAddress()) {
			if (wallet.getBalance().isLessThan(0) && !genesisPublicKeys[wallet.getPublicKey()!]) {
				logNegativeBalance(wallet, "balance", wallet.getBalance());

				throw new Error("Non-genesis wallet with negative balance.");
			}

			if (wallet.hasAttribute("validator.voteBalance")) {
				const voteBalance: BigNumber = wallet.getAttribute("validator.voteBalance");

				if (voteBalance.isLessThan(0)) {
					logNegativeBalance(wallet, "vote balance", voteBalance);
					throw new Error("Wallet with negative vote balance.");
				}
			}
		}
	}
}
