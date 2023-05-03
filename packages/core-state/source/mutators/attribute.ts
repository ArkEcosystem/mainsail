import { injectable } from "@mainsail/core-container";
import { Contracts } from "@mainsail/core-contracts";

@injectable()
export class AttributeMutator implements Contracts.State.ValidatorMutator {
	public async apply(wallet: Contracts.State.Wallet, block: Contracts.Crypto.IBlockData): Promise<void> {
		wallet.getAttribute<Contracts.State.WalletValidatorAttributes>("validator").lastBlock = block;
	}

	public async revert(wallet: Contracts.State.Wallet, block: Contracts.Crypto.IBlockData): Promise<void> {
		wallet.getAttribute<Contracts.State.WalletValidatorAttributes>("validator").lastBlock = undefined;
	}
}
