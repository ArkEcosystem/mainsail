import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Application, Enums } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

// @TODO review the implementation
@injectable()
export class StateBuilder {
	@inject(Identifiers.Application)
	private readonly app!: Application;

	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.EventDispatcherService)
	private events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Consensus.ProposerPicker)
	private readonly proposerPicker!: Contracts.Consensus.IProposerPicker;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	public async run(): Promise<void> {
		this.events = this.app.get<Contracts.Kernel.EventDispatcher>(Identifiers.EventDispatcherService);

		const registeredHandlers = this.app
			.getTagged<Contracts.Transactions.ITransactionHandlerRegistry>(
				Identifiers.TransactionHandlerRegistry,
				"state",
				"blockchain",
			)
			.getRegisteredHandlers();

		try {
			const lastBlockHeight = await this.#lastCommittedBlockHeight();

			this.logger.info(`State Generation - Bootstrap - Blocks: ${lastBlockHeight}`);

			for await (const committedBlock of this.databaseService.readCommittedBlocksByHeight(0, lastBlockHeight)) {
				await this.#buildCommittedRound(committedBlock);

				await this.#buildBlockRewards(committedBlock.block.data);
				await this.#buildSentTransactions(committedBlock.block.transactions);

				for (const handler of registeredHandlers.values()) {
					await handler.bootstrap(this.walletRepository, committedBlock.block.transactions);
				}
			}

			this.logger.info(
				`Number of registered validators: ${Object.keys(
					this.walletRepository.allByUsername(),
				).length.toLocaleString()}`,
			);

			this.logger.debug(`Last committed round: ${this.stateStore.getLastCommittedRound()}`);

			this.#verifyWalletsConsistency();

			await this.validatorSet.initialize();

			await this.events.dispatch(Enums.StateEvent.BuilderFinished);
		} catch (error) {
			this.logger.error(error.stack);
		}
	}

	async #buildBlockRewards(block: Contracts.Crypto.IBlockData): Promise<void> {
		const wallet = await this.walletRepository.findByPublicKey(block.generatorPublicKey);
		wallet.increaseBalance(BigNumber.make(block.reward));
	}

	async #buildSentTransactions(transactions: Contracts.Crypto.ITransaction[]): Promise<void> {
		for (const { data: transaction } of transactions) {
			const wallet = await this.walletRepository.findByPublicKey(transaction.senderPublicKey);
			wallet.setNonce(BigNumber.make(transaction.nonce));
			wallet.decreaseBalance(BigNumber.make(transaction.amount).plus(transaction.fee));
		}
	}

	async #buildCommittedRound(committedBlock: Contracts.Crypto.ICommittedBlock): Promise<void> {
		const lastCommittedRound = this.stateStore.getLastCommittedRound();
		this.stateStore.setLastCommittedRound(lastCommittedRound + committedBlock.commit.round + 1);
		await this.proposerPicker.onCommit(committedBlock);
	}

	#verifyWalletsConsistency(): void {
		const logNegativeBalance = (wallet, type, balance) =>
			this.logger.warning(`Wallet ${wallet.address} has a negative ${type} of '${balance}'`);

		const genesisPublicKeys: Record<string, true> = Object.fromEntries(
			this.configuration.get("genesisBlock.block.transactions").map((current) => [current.senderPublicKey, true]),
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

	async #lastCommittedBlockHeight(): Promise<number> {
		const lastBlock = await this.databaseService.getLastBlock();
		if (!lastBlock) {
			return 0;
		}

		return lastBlock.header.height;
	}
}
