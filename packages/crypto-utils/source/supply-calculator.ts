import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

export const calculateSupply = (height: number, configuration: Contracts.Crypto.Configuration): BigNumber => {
	const initialSupply = BigNumber.make(configuration.get("genesisBlock.block.totalAmount"));

	const milestones = configuration.get("milestones");
	if (height === 0 || milestones.length === 0) {
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
};
