import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";

@injectable()
export class BurnFeeMutator implements Contracts.State.ValidatorMutator {
	@inject(Identifiers.WalletRepository)
	private readonly walletRepository: Contracts.State.WalletRepository;

	public async apply(wallet: Contracts.State.Wallet, block: Contracts.Crypto.IBlockData): Promise<void> {
		const amount: BigNumber = this.#calculate(block);

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

	public async revert(wallet: Contracts.State.Wallet, block: Contracts.Crypto.IBlockData): Promise<void> {
		const amount: BigNumber = this.#calculate(block);

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

	#calculate(block: Contracts.Crypto.IBlockData): BigNumber {
		const burnPercentage = 100; // @TODO: make configurable

		let fee: BigNumber = block.totalFee;

		if (burnPercentage >= 0 && burnPercentage <= 100) {
			fee = fee.times(100 - burnPercentage).dividedBy(100);
		}

		return fee;
	}
}
