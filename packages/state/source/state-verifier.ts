import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class StateVerifier implements Contracts.State.StateVerifier {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.State.Service)
	private stateService!: Contracts.State.Service;

	@inject(Identifiers.Services.Log.Service)
	private logger!: Contracts.Kernel.Logger;

	verifyWalletsConsistency(): void {
		this.logger.info(
			`Number of registered validators: ${Object.keys(
				this.stateService.getStore().walletRepository.allValidators(),
			).length.toLocaleString()}`,
		);

		const logNegativeBalance = (wallet, type, balance) =>
			this.logger.warning(`Wallet ${wallet.address} has a negative ${type} of '${balance}'`);

		const genesisPublicKeys: Record<string, true> = Object.fromEntries(
			this.configuration.get("genesisBlock.block.transactions").map((current) => [current.senderPublicKey, true]),
		);

		for (const wallet of this.stateService.getStore().walletRepository.allByAddress()) {
			if (wallet.getBalance().isLessThan(0) && !genesisPublicKeys[wallet.getPublicKey()!]) {
				logNegativeBalance(wallet, "balance", wallet.getBalance());

				throw new Error("Non-genesis wallet with negative balance.");
			}

			if (wallet.hasAttribute("validatorVoteBalance")) {
				const voteBalance: BigNumber = wallet.getAttribute("validatorVoteBalance");

				if (voteBalance.isLessThan(0)) {
					logNegativeBalance(wallet, "vote balance", voteBalance);
					throw new Error("Wallet with negative vote balance.");
				}
			}
		}
	}
}
