import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class AttributeMutator implements Contracts.State.ValidatorMutator {
	public async apply(
		walletRepository: Contracts.State.WalletRepository,
		wallet: Contracts.State.Wallet,
		block: Contracts.Crypto.IBlockData,
	): Promise<void> {
		wallet.setAttribute<Contracts.Crypto.IBlockData>("validatorLastBlock", block);
	}

	public async revert(
		walletRepository: Contracts.State.WalletRepository,
		wallet: Contracts.State.Wallet,
		block: Contracts.Crypto.IBlockData,
	): Promise<void> {
		// eslint-disable-next-line unicorn/no-useless-undefined
		wallet.setAttribute<Contracts.Crypto.IBlockData | undefined>("validatorLastBlock", undefined);
	}
}
