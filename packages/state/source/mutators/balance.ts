import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class BalanceMutator implements Contracts.State.ValidatorMutator {
	public async apply(
		walletRepository: Contracts.State.WalletRepository,
		wallet: Contracts.State.Wallet,
		block: Contracts.Crypto.IBlockData,
	): Promise<void> {
		const amount = block.reward.plus(block.totalFee);

		// ? packages/transactions/source/handlers/one/vote.ts:L120 blindly sets "vote" attribute
		// ? is it guaranteed that validator wallet exists, so validatorWallet.getAttribute("validator.voteBalance") is safe?
		if (wallet.hasVoted()) {
			const validatorWallet: Contracts.State.Wallet = await walletRepository.findByPublicKey(
				wallet.getAttribute<string>("vote"),
			);

			validatorWallet.setAttribute(
				"validator.voteBalance",
				validatorWallet.getAttribute<BigNumber>("validator.voteBalance").plus(amount),
			);
		}

		wallet.increaseBalance(amount);
	}

	public async revert(
		walletRepository: Contracts.State.WalletRepository,
		wallet: Contracts.State.Wallet,
		block: Contracts.Crypto.IBlockData,
	): Promise<void> {
		const amount = block.reward.plus(block.totalFee);

		if (wallet.hasVoted()) {
			const validatorWallet: Contracts.State.Wallet = await walletRepository.findByPublicKey(
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
