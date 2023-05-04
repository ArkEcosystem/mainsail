import { Contracts } from "@mainsail/contracts";

export const Utils = {
	getRemainingSlotTime(
		round: Contracts.P2P.CurrentRound,
		configuration: Contracts.Crypto.IConfiguration,
	): number | undefined {
		if (round) {
			const { blockTime } = configuration.getMilestone(round.lastBlock.height);

			return round.timestamp * 1000 + blockTime * 1000 - Date.now();
		}

		return undefined;
	},
};
