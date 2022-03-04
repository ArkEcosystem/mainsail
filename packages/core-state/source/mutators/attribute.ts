import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";

@injectable()
export class AttributeMutator implements Contracts.State.ValidatorMutator {
	public async apply(wallet: Contracts.State.Wallet, block: Contracts.Crypto.IBlockData): Promise<void> {
		const validator = wallet.getAttribute<Contracts.State.WalletValidatorAttributes>("validator");
		validator.producedBlocks++;
		validator.forgedFees = validator.forgedFees.plus(block.totalFee);
		validator.forgedRewards = validator.forgedRewards.plus(block.reward);
		validator.lastBlock = block;
	}

	public async revert(wallet: Contracts.State.Wallet, block: Contracts.Crypto.IBlockData): Promise<void> {
		const validator = wallet.getAttribute<Contracts.State.WalletValidatorAttributes>("validator");
		validator.producedBlocks--;
		validator.forgedFees = validator.forgedFees.minus(block.totalFee);
		validator.forgedRewards = validator.forgedRewards.minus(block.reward);
		validator.lastBlock = undefined;
	}
}
