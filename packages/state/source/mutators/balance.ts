import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class BalanceMutator implements Contracts.State.ValidatorMutator {
	public async apply(
		walletRepository: Contracts.State.WalletRepository,
		wallet: Contracts.State.Wallet,
		block: Contracts.Crypto.BlockData,
	): Promise<void> {
		const amount = block.reward.plus(block.totalFee);

		// ? packages/transactions/source/handlers/one/vote.ts:L120 blindly sets "vote" attribute
		// ? is it guaranteed that validator wallet exists, so validatorWallet.getAttribute("validatorVoteBalance") is safe?
		if (wallet.hasVoted()) {
			const validatorWallet: Contracts.State.Wallet = await walletRepository.findByPublicKey(
				wallet.getAttribute<string>("vote"),
			);

			validatorWallet.setAttribute(
				"validatorVoteBalance",
				validatorWallet.getAttribute<BigNumber>("validatorVoteBalance").plus(amount),
			);
		}

		wallet.increaseBalance(amount);
	}
}
