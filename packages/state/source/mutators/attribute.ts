import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class AttributeMutator implements Contracts.State.ValidatorMutator {
	public async apply(
		walletRepository: Contracts.State.WalletRepository,
		wallet: Contracts.State.Wallet,
		block: Contracts.Crypto.IBlockData,
	): Promise<void> {
		wallet.setAttribute("validatorLastBlock", {
			height: block.height,
			id: block.id,
			timestamp: block.timestamp,
		});

		const forgedFees = wallet.getAttribute("validatorForgedFees", Utils.BigNumber.ZERO);
		wallet.setAttribute("validatorForgedFees", forgedFees.plus(block.totalFee));

		const forgedRewards = wallet.getAttribute("validatorForgedRewards", Utils.BigNumber.ZERO);
		wallet.setAttribute("validatorForgedRewards", forgedRewards.plus(block.reward));

		const producedBlocks = wallet.getAttribute("validatorProducedBlocks", 0);
		wallet.setAttribute("validatorProducedBlocks", producedBlocks + 1);
	}
}
