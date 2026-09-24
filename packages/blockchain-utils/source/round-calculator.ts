import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { InvalidMilestoneConfigurationError } from "@mainsail/exceptions";
import { assert } from "@mainsail/utils";

type ValidatorSpan = {
	startHeight: number;
	endHeight?: number;
	startRound: number;
	roundValidators: number;
};

@injectable()
export class RoundCalculator implements Contracts.BlockchainUtils.RoundCalculator {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public isNewRound(height: number): boolean {
		if (height === this.configuration.getGenesisHeight()) {
			return true;
		}

		const { roundValidators, startHeight } = this.#getValidatorSpan(height);

		return (height - startHeight) % roundValidators === 0;
	}

	public calculateRound(height: number): Contracts.Shared.RoundInfo {
		const genesisHeight = this.configuration.getGenesisHeight();

		// Genesis round requires special treatment
		if (height === genesisHeight) {
			return { maxValidators: 0, nextRound: 1, round: 0, roundHeight: genesisHeight };
		}

		const { roundValidators, startHeight, startRound } = this.#getValidatorSpan(height);

		const heightsIntoSpan = height - startHeight;
		const roundsIntoSpan = Math.floor(heightsIntoSpan / roundValidators);
		const round = startRound + roundsIntoSpan;

		return {
			maxValidators: roundValidators,
			// The next block starts a new round when this one is the last block of its round
			nextRound: (heightsIntoSpan + 1) % roundValidators === 0 ? round + 1 : round,
			round,
			roundHeight: startHeight + roundsIntoSpan * roundValidators,
		};
	}

	#getValidatorSpan(height: number): ValidatorSpan {
		const genesisHeight = this.configuration.getGenesisHeight();
		if (height < genesisHeight) {
			throw new Error(`Height ${height} is below the genesis height ${genesisHeight}`);
		}

		const span = this.#getValidatorSpans().find((span) => span.endHeight === undefined || height <= span.endHeight);
		assert.defined(span);

		return span;
	}

	#getValidatorSpans(): ValidatorSpan[] {
		const spans: ValidatorSpan[] = [];

		// Round 1 starts right after genesis, the genesis block alone forms round 0
		let startHeight = this.configuration.getGenesisHeight() + 1;
		let startRound = 1;
		let roundValidators = Math.max(1, this.configuration.getMilestone(startHeight).roundValidators);
		let nextMilestone = this.configuration.getNextMilestoneWithNewKey(startHeight, "roundValidators");

		while (nextMilestone.found) {
			const spanHeights = nextMilestone.height - startHeight;
			if (spanHeights % roundValidators !== 0) {
				throw new InvalidMilestoneConfigurationError(
					`Bad milestone at height: ${nextMilestone.height}. The number of validators can only be changed at the beginning of a new round.`,
				);
			}

			spans.push({ endHeight: nextMilestone.height - 1, roundValidators, startHeight, startRound });

			startHeight = nextMilestone.height;
			startRound += spanHeights / roundValidators;
			assert.number(nextMilestone.data);
			roundValidators = Math.max(1, nextMilestone.data);
			nextMilestone = this.configuration.getNextMilestoneWithNewKey(startHeight, "roundValidators");
		}

		spans.push({ roundValidators, startHeight, startRound });

		return spans;
	}
}
