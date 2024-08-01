import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils as AppUtils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class TransactionProcessor implements Contracts.Processor.TransactionProcessor {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Evm.Gas.FeeCalculator)
	private readonly gasFeeCalculator!: Contracts.Evm.GasFeeCalculator;

	@inject(Identifiers.Application.Instance)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Transaction.Handler.Registry)
	private readonly handlerRegistry!: Contracts.Transactions.TransactionHandlerRegistry;

	@inject(Identifiers.State.Service)
	private readonly stateService!: Contracts.State.Service;

	async process(
		unit: Contracts.Processor.ProcessableUnit,
		transaction: Contracts.Crypto.Transaction,
	): Promise<Contracts.Processor.TransactionProcessorResult> {
		const walletRepository = unit.store.walletRepository;

		const milestone = this.configuration.getMilestone(unit.height);
		const transactionHandler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);

		const validator: Contracts.State.Wallet = await walletRepository.findByPublicKey(
			unit.getBlock().data.generatorPublicKey,
		);

		const commitKey: Contracts.Evm.CommitKey = {
			height: BigInt(unit.height),
			round: BigInt(unit.getBlock().data.round),
		};

		const transactionHandlerContext: Contracts.Transactions.TransactionHandlerContext = {
			evm: {
				blockContext: {
					commitKey,
					gasLimit: BigInt(milestone.block.maxGasLimit),
					timestamp: BigInt(unit.getBlock().data.timestamp),
					validatorAddress: validator.getAddress(),
				},
				instance: this.evm,
			},
			walletRepository,
		};

		if (!(await transactionHandler.verify(transactionHandlerContext, transaction))) {
			throw new Exceptions.InvalidSignatureError();
		}

		const result = await transactionHandler.apply(transactionHandlerContext, transaction);
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		let recipient: Contracts.State.Wallet | undefined;
		if (transaction.data.recipientId) {
			AppUtils.assert.defined<string>(transaction.data.recipientId);

			recipient = walletRepository.findByAddress(transaction.data.recipientId);
		}

		await this.#updateVoteBalances(walletRepository, sender, recipient, transaction.data, result);
		await this.#updateEvmAccountInfoHost(commitKey, walletRepository);
		await this.#applyWalletChangesFromEvm(walletRepository, result);

		return { gasUsed: result.gasUsed, receipt: result.receipt };
	}

	async #updateVoteBalances(
		walletRepository: Contracts.State.WalletRepository,
		sender: Contracts.State.Wallet,
		recipient: Contracts.State.Wallet | undefined,
		transaction: Contracts.Crypto.TransactionData,
		result: Contracts.Transactions.TransactionApplyResult,
	): Promise<void> {
		// Vote
		if (
			transaction.type === Contracts.Crypto.TransactionType.Vote &&
			transaction.typeGroup === Contracts.Crypto.TransactionTypeGroup.Core
		) {
			AppUtils.assert.defined<Contracts.Crypto.TransactionAsset>(transaction.asset?.votes);
			AppUtils.assert.defined<Contracts.Crypto.TransactionAsset>(transaction.asset?.unvotes);

			const senderValidatorAmount = sender.getBalance();

			if (transaction.asset.unvotes.length > 0) {
				const unvote: string = transaction.asset.unvotes[0];
				const validator: Contracts.State.Wallet = await walletRepository.findByPublicKey(unvote);

				// unvote also changes vote balance by fee
				const voteBalanceChange: BigNumber = senderValidatorAmount.plus(transaction.fee);

				const voteBalance: BigNumber = validator
					.getAttribute("validatorVoteBalance", BigNumber.ZERO)
					.minus(voteBalanceChange);

				validator.setAttribute("validatorVoteBalance", voteBalance);
			}

			if (transaction.asset.votes.length > 0) {
				const vote: string = transaction.asset.votes[0];
				const validator: Contracts.State.Wallet = await walletRepository.findByPublicKey(vote);

				const voteBalance: BigNumber = validator
					.getAttribute("validatorVoteBalance", BigNumber.ZERO)
					.plus(senderValidatorAmount);

				validator.setAttribute("validatorVoteBalance", voteBalance);
			}

			// nothing else to update
			return;
		}

		// EVM Call
		if (
			transaction.type === Contracts.Crypto.TransactionType.EvmCall &&
			transaction.typeGroup === Contracts.Crypto.TransactionTypeGroup.Core
		) {
			if (sender.hasVoted()) {
				// Reduce vote balance by consumed fee (TODO: can be removed once evm deducts fee as it will be handled by 'changes')
				const feeConsumed = this.gasFeeCalculator.calculateConsumed(transaction.fee, Number(result.gasUsed));
				const validator = await walletRepository.findByPublicKey(sender.getAttribute("vote"));
				const voteBalance = validator.getAttribute("validatorVoteBalance", BigNumber.ZERO);
				validator.setAttribute("validatorVoteBalance", voteBalance.minus(feeConsumed));
			}

			if (result.receipt?.changes) {
				for (const [address, change] of Object.entries(result.receipt.changes)) {
					const wallet = walletRepository.findByAddress(address);
					if (wallet.hasVoted()) {
						const voteChange = BigNumber.make(change.balance).minus(wallet.getBalance());
						if (voteChange.isZero()) {
							continue;
						}

						const vote = wallet.getAttribute("vote");
						console.log(
							`updating vote balance from evm change voter=${address} oldBalance=${wallet.getBalance().toBigInt()} newBalance=${change.balance} diff=${voteChange}`,
						);

						const validator = await walletRepository.findByPublicKey(vote);
						const voteBalance = validator.getAttribute("validatorVoteBalance", BigNumber.ZERO);
						validator.setAttribute("validatorVoteBalance", voteBalance.plus(voteChange));
					}
				}
			}

			// nothing else to update
			return;
		}

		// MultiPayment
		if (
			transaction.type === Contracts.Crypto.TransactionType.MultiPayment &&
			transaction.typeGroup === Contracts.Crypto.TransactionTypeGroup.Core
		) {
			AppUtils.assert.defined<Contracts.Crypto.MultiPaymentItem[]>(transaction.asset?.payments);

			// go through all payments and update recipients validators vote balance
			for (const { recipientId, amount } of transaction.asset.payments) {
				const recipientWallet: Contracts.State.Wallet = walletRepository.findByAddress(recipientId);
				if (recipientWallet.hasVoted()) {
					const vote = recipientWallet.getAttribute("vote");
					const validator: Contracts.State.Wallet = await walletRepository.findByPublicKey(vote);
					const voteBalance: BigNumber = validator.getAttribute("validatorVoteBalance", BigNumber.ZERO);
					validator.setAttribute("validatorVoteBalance", voteBalance.plus(amount));
				}
			}
		} else {
			// Update vote balance of recipient's validator (recipient cannot be a contract)
			if (recipient && recipient.hasVoted()) {
				const validator: Contracts.State.Wallet = await walletRepository.findByPublicKey(
					recipient.getAttribute("vote"),
				);
				const voteBalance: BigNumber = validator.getAttribute("validatorVoteBalance", BigNumber.ZERO);

				validator.setAttribute("validatorVoteBalance", voteBalance.plus(transaction.amount));
			}
		}

		// Update vote balance of the sender's validator
		if (sender.hasVoted()) {
			const validator: Contracts.State.Wallet = await walletRepository.findByPublicKey(
				sender.getAttribute("vote"),
			);

			const total: BigNumber = transaction.amount.plus(transaction.fee);
			const voteBalance: BigNumber = validator.getAttribute("validatorVoteBalance", BigNumber.ZERO);

			// General case : sender validator vote balance reduced by amount + fees (or increased if revert)
			validator.setAttribute("validatorVoteBalance", voteBalance.minus(total));
		}
	}

	async #updateEvmAccountInfoHost(
		commitKey: Contracts.Evm.CommitKey,
		walletRepository: Contracts.State.WalletRepository,
	): Promise<void> {
		await this.evm.updateAccountChange({
			commitKey,
			dirtyWallets: walletRepository.takeDirtyWalletsFromTransaction(),
		});
	}

	async #applyWalletChangesFromEvm(
		walletRepository: Contracts.State.WalletRepository,
		result: Contracts.Transactions.TransactionApplyResult,
	): Promise<void> {
		if (!result.receipt?.changes) {
			return;
		}

		const baseWalletRepository = this.stateService.getStore().walletRepository;

		// Update balances of all accounts that were changes as part of evm execution
		for (const [address, change] of Object.entries(result.receipt.changes)) {
			const wallet = walletRepository.findByAddress(address);

			// Check change against original wallet to cover the case where the transaction fee
			// subtraction on the host gets overwritten (TODO: might be possible to obsolete this by handling fees directly in EVM)
			const hasOriginal = baseWalletRepository.hasByAddress(address);
			if (hasOriginal) {
				const original = baseWalletRepository.findByAddress(address);
				if (original.getBalance().isEqualTo(change.balance)) {
					continue;
				}
			}

			// Apply balance change from EVM (if any)
			const diff = BigNumber.make(change.balance).minus(wallet.getBalance());
			if (diff.isZero()) {
				continue;
			}

			console.log(
				`applying balance update from evm address=${address} oldBalance=${wallet.getBalance().toBigInt()} newBalance=${change.balance} diff=${diff}`,
			);

			wallet.setBalance(BigNumber.make(change.balance));
		}
	}
}
