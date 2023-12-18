import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class AttributeMutator implements Contracts.State.ValidatorMutator {
	public async apply(
		walletRepository: Contracts.State.WalletRepository,
		wallet: Contracts.State.Wallet,
		block: Contracts.Crypto.BlockData,
	): Promise<void> {
		wallet.setAttribute("validatorLastBlock", {
			height: block.height,
			id: block.id,
			timestamp: block.timestamp,
		});

		const totalForgedFees = wallet.getAttribute("validatorForgedFees", Utils.BigNumber.ZERO).plus(block.totalFee);

		wallet.setAttribute("validatorForgedFees", totalForgedFees);

		const totalForgedRewards = wallet
			.getAttribute("validatorForgedRewards", Utils.BigNumber.ZERO)
			.plus(block.reward);

		wallet.setAttribute("validatorForgedRewards", totalForgedRewards);

		const forgedTotal = totalForgedFees.plus(totalForgedRewards);
		wallet.setAttribute("validatorForgedTotal", forgedTotal);

		const producedBlocks = wallet.getAttribute("validatorProducedBlocks", 0);
		wallet.setAttribute("validatorProducedBlocks", producedBlocks + 1);
	}
}
