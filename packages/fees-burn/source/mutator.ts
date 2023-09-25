import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class BurnFeeMutator implements Contracts.State.ValidatorMutator {
	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "fees-managed")
	private readonly pluginConfiguration!: Providers.PluginConfiguration;

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
				"validatorVoteBalance",
				validatorWallet.getAttribute<BigNumber>("validatorVoteBalance").minus(amount),
			);
		}

		wallet.decreaseBalance(amount);
	}

	#calculate(block: Contracts.Crypto.IBlockData): BigNumber {
		const burnPercentage = this.pluginConfiguration.get<number>("percentage");
		Utils.assert.defined<number>(burnPercentage);

		let fee: BigNumber = block.totalFee;

		if (burnPercentage >= 0 && burnPercentage <= 100) {
			fee = fee.times(100 - burnPercentage).dividedBy(100);
		}

		return fee;
	}
}
