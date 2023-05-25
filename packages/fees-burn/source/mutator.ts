import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class BurnFeeMutator implements Contracts.State.ValidatorMutator {
	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "fees-managed")
	private readonly pluginConfiguration: Providers.PluginConfiguration;

	public async apply(
		walletRepository: Contracts.State.WalletRepository,
		wallet: Contracts.State.Wallet,
		block: Contracts.Crypto.IBlockData,
	): Promise<void> {
		const amount: BigNumber = this.#calculate(block);

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

	public async revert(
		walletRepository: Contracts.State.WalletRepository,
		wallet: Contracts.State.Wallet,
		block: Contracts.Crypto.IBlockData,
	): Promise<void> {
		const amount: BigNumber = this.#calculate(block);

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

	#calculate(block: Contracts.Crypto.IBlockData): BigNumber {
		const burnPercentage: number = this.pluginConfiguration.get("percentage");

		let fee: BigNumber = block.totalFee;

		if (burnPercentage >= 0 && burnPercentage <= 100) {
			fee = fee.times(100 - burnPercentage).dividedBy(100);
		}

		return fee;
	}
}
