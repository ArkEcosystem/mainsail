import { Contracts } from "@arkecosystem/core-contracts";

export const getRemainingSlotTime = (
	round: Contracts.P2P.CurrentRound,
	configuration: Contracts.Crypto.IConfiguration,
): number | undefined => {
	if (round) {
		const { blockTime } = configuration.getMilestone(round.lastBlock.height);

		return round.timestamp * 1000 + blockTime * 1000 - Date.now();
	}

	return undefined;
};
