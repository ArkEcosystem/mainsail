import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class StateVerifier implements Contracts.State.StateVerifier {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.LogService)
	private logger!: Contracts.Kernel.Logger;

	verifyWalletsConsistency(): void {
		this.logger.info(
			`Number of registered validators: ${Object.keys(
				this.walletRepository.allByUsername(),
			).length.toLocaleString()}`,
		);

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
