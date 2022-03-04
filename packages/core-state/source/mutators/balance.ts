import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";

@injectable()
export class BalanceMutator implements Contracts.State.ValidatorMutator {
	@inject(Identifiers.WalletRepository)
	private readonly walletRepository: Contracts.State.WalletRepository;

	public async apply(wallet: Contracts.State.Wallet, block: Contracts.Crypto.IBlockData): Promise<void> {
		const amount = block.reward.plus(block.totalFee);

		// ? packages/core-transactions/source/handlers/one/vote.ts:L120 blindly sets "vote" attribute
		// ? is it guaranteed that validator wallet exists, so validatorWallet.getAttribute("validator.voteBalance") is safe?
		if (wallet.hasVoted()) {
			const validatorWallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
				wallet.getAttribute<string>("vote"),
			);

			validatorWallet.setAttribute(
				"validator.voteBalance",
				validatorWallet.getAttribute<BigNumber>("validator.voteBalance").plus(amount),
			);
		}

		wallet.increaseBalance(amount);
	}

	public async revert(wallet: Contracts.State.Wallet, block: Contracts.Crypto.IBlockData): Promise<void> {
		const amount = block.reward.plus(block.totalFee);

		if (wallet.hasVoted()) {
			const validatorWallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
				wallet.getAttribute<string>("vote"),
			);

			validatorWallet.setAttribute(
				"validator.voteBalance",
				validatorWallet.getAttribute<BigNumber>("validator.voteBalance").minus(amount),
			);
		}

		wallet.decreaseBalance(amount);
	}
}
