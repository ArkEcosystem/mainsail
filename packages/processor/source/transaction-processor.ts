import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils as AppUtils } from "@mainsail/kernel";

@injectable()
export class TransactionProcessor implements Contracts.Processor.TransactionProcessor {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Application.Instance)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Transaction.Handler.Registry)
	private readonly handlerRegistry!: Contracts.Transactions.TransactionHandlerRegistry;

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

		await this.#updateVoteBalances(walletRepository, sender, recipient, transaction.data);
		await this.#updateEvmAccountInfoHost(commitKey, sender);

		return { gasUsed: result.gasUsed, receipt: result.receipt };
	}

	async #updateVoteBalances(
		walletRepository: Contracts.State.WalletRepository,
		sender: Contracts.State.Wallet,
		recipient: Contracts.State.Wallet | undefined,
		transaction: Contracts.Crypto.TransactionData,
	): Promise<void> {
		return;
		// if (
		// 	transaction.type === Contracts.Crypto.TransactionType.Vote &&
		// 	transaction.typeGroup === Contracts.Crypto.TransactionTypeGroup.Core
		// ) {
		// 	AppUtils.assert.defined<Contracts.Crypto.TransactionAsset>(transaction.asset?.votes);
		// 	AppUtils.assert.defined<Contracts.Crypto.TransactionAsset>(transaction.asset?.unvotes);

		// 	const senderValidatorAmount = sender.getBalance();

		// 	if (transaction.asset.unvotes.length > 0) {
		// 		const unvote: string = transaction.asset.unvotes[0];
		// 		const validator: Contracts.State.Wallet = await walletRepository.findByPublicKey(unvote);

		// 		// unvote also changes vote balance by fee
		// 		const voteBalanceChange: BigNumber = senderValidatorAmount.plus(transaction.fee);

		// 		const voteBalance: BigNumber = validator
		// 			.getAttribute("validatorVoteBalance", BigNumber.ZERO)
		// 			.minus(voteBalanceChange);

		// 		validator.setAttribute("validatorVoteBalance", voteBalance);
		// 	}

		// 	if (transaction.asset.votes.length > 0) {
		// 		const vote: string = transaction.asset.votes[0];
		// 		const validator: Contracts.State.Wallet = await walletRepository.findByPublicKey(vote);

		// 		const voteBalance: BigNumber = validator
		// 			.getAttribute("validatorVoteBalance", BigNumber.ZERO)
		// 			.plus(senderValidatorAmount);

		// 		validator.setAttribute("validatorVoteBalance", voteBalance);
		// 	}
		// } else {
		// 	// Update vote balance of the sender's validator
		// 	if (sender.hasVoted()) {
		// 		const validator: Contracts.State.Wallet = await walletRepository.findByPublicKey(
		// 			sender.getAttribute("vote"),
		// 		);

		// 		let amount: BigNumber = transaction.amount;
		// 		if (
		// 			transaction.type === Contracts.Crypto.TransactionType.MultiPayment &&
		// 			transaction.typeGroup === Contracts.Crypto.TransactionTypeGroup.Core
		// 		) {
		// 			AppUtils.assert.defined<Contracts.Crypto.MultiPaymentItem[]>(transaction.asset?.payments);

		// 			amount = transaction.asset.payments.reduce(
		// 				(previous, current) => previous.plus(current.amount),
		// 				BigNumber.ZERO,
		// 			);
		// 		}

		// 		const total: BigNumber = amount.plus(transaction.fee);

		// 		const voteBalance: BigNumber = validator.getAttribute("validatorVoteBalance", BigNumber.ZERO);

		// 		// General case : sender validator vote balance reduced by amount + fees (or increased if revert)
		// 		validator.setAttribute("validatorVoteBalance", voteBalance.minus(total));
		// 	}

		// 	if (
		// 		transaction.type === Contracts.Crypto.TransactionType.MultiPayment &&
		// 		transaction.typeGroup === Contracts.Crypto.TransactionTypeGroup.Core
		// 	) {
		// 		AppUtils.assert.defined<Contracts.Crypto.MultiPaymentItem[]>(transaction.asset?.payments);

		// 		// go through all payments and update recipients validators vote balance
		// 		for (const { recipientId, amount } of transaction.asset.payments) {
		// 			const recipientWallet: Contracts.State.Wallet = walletRepository.findByAddress(recipientId);
		// 			if (recipientWallet.hasVoted()) {
		// 				const vote = recipientWallet.getAttribute("vote");
		// 				const validator: Contracts.State.Wallet = await walletRepository.findByPublicKey(vote);
		// 				const voteBalance: BigNumber = validator.getAttribute("validatorVoteBalance", BigNumber.ZERO);
		// 				validator.setAttribute("validatorVoteBalance", voteBalance.plus(amount));
		// 			}
		// 		}
		// 	}

		// 	// Update vote balance of recipient's validator
		// 	if (recipient && recipient.hasVoted()) {
		// 		const validator: Contracts.State.Wallet = await walletRepository.findByPublicKey(
		// 			recipient.getAttribute("vote"),
		// 		);
		// 		const voteBalance: BigNumber = validator.getAttribute("validatorVoteBalance", BigNumber.ZERO);

		// 		validator.setAttribute("validatorVoteBalance", voteBalance.plus(transaction.amount));
		// 	}
		// }
	}

	async #updateEvmAccountInfoHost(commitKey: Contracts.Evm.CommitKey, sender: Contracts.State.Wallet): Promise<void> {
		await this.evm.updateAccountInfo({
			account: sender.getAddress(),
			commitKey,
			nonce: sender.getNonce().toBigInt(),
		});
	}
}
