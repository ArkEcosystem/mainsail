import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class AttributeMutator implements Contracts.State.ValidatorMutator {
	public async apply(
		walletRepository: Contracts.State.WalletRepository,
		wallet: Contracts.State.Wallet,
		block: Contracts.Crypto.IBlockData,
	): Promise<void> {
		wallet.getAttribute<Contracts.State.WalletValidatorAttributes>("validator").lastBlock = block;
	}

	public async revert(
		walletRepository: Contracts.State.WalletRepository,
		wallet: Contracts.State.Wallet,
		block: Contracts.Crypto.IBlockData,
	): Promise<void> {
		wallet.getAttribute<Contracts.State.WalletValidatorAttributes>("validator").lastBlock = undefined;
	}
}
