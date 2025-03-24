import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class SupplyCalculator implements Contracts.BlockchainUtils.SupplyCalculator {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	calculateSupply(height: number): BigNumber {
		const initialSupply = BigNumber.make(this.configuration.get("genesisBlock.block.amount"));

		const milestones = this.configuration.get("milestones");
		const genesisHeight = this.configuration.getGenesisHeight();

		if (height === genesisHeight || milestones.length === 0) {
			return initialSupply;
		}

		let accumulatedRewards = BigNumber.ZERO;
		let currentHeight = 0;
		let constantIndex = 0;

		while (currentHeight < height) {
			const constants = milestones[constantIndex];
			const nextConstants = milestones[constantIndex + 1];

			let heightJump: number = height - currentHeight;

			if (nextConstants && height >= nextConstants.height && currentHeight < nextConstants.height - 1) {
				heightJump = nextConstants.height - 1 - currentHeight;
				constantIndex += 1;
			}

			currentHeight += heightJump;

			if (currentHeight >= constants.height) {
				accumulatedRewards = accumulatedRewards.plus(BigNumber.make(constants.reward).times(heightJump));
			}
		}

		return initialSupply.plus(accumulatedRewards);
	}
}
