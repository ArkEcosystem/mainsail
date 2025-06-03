import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { assert } from "@mainsail/utils";

export interface MilestoneSearchResult {
	found: boolean;
	height: number;
	data: any;
}

@injectable()
export class RoundCalculator implements Contracts.BlockchainUtils.RoundCalculator {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public isNewRound(height: number): boolean {
		const milestones = this.configuration.get("milestones");
		const genesisHeight = this.configuration.getGenesisHeight();

		// Since milestones are merged, find the first milestone to introduce the validator count.
		let milestone;
		for (let index = milestones.length - 1; index >= 0; index--) {
			const temporary = milestones[index];
			if (temporary.height > height) {
				continue;
			}

			if (!milestone || temporary.roundValidators === milestone.roundValidators) {
				milestone = temporary;
			} else {
				break;
			}
		}

		return height === genesisHeight || (height - Math.max(milestone.height, 1)) % milestone.roundValidators === 0;
	}

	public calculateRound(height: number): Contracts.Shared.RoundInfo {
		const genesisHeight = this.configuration.getGenesisHeight();

		let nextMilestone = this.configuration.getNextMilestoneWithNewKey(genesisHeight, "roundValidators");
		let roundValidators = this.configuration.getMilestone(genesisHeight).roundValidators;

		// Genesis round requires special treatment
		if (height === genesisHeight) {
			return { maxValidators: 0, nextRound: 1, round: 0, roundHeight: genesisHeight };
		}

		const result: Contracts.Shared.RoundInfo = {
			maxValidators: 0,
			nextRound: 0,
			round: 1,
			roundHeight: genesisHeight + 1,
		};

		let milestoneHeight = genesisHeight;

		const milestones = this.getMilestonesWhichAffectActiveValidatorCount(this.configuration);
		for (let index = 0; index < milestones.length - 1; index++) {
			if (height < nextMilestone.height) {
				break;
			}

			const spanHeight = nextMilestone.height - milestoneHeight - 1;
			if (milestoneHeight > genesisHeight && spanHeight % roundValidators !== 0) {
				throw new Exceptions.InvalidMilestoneConfigurationError(
					`Bad milestone at height: ${height}. The number of validators can only be changed at the beginning of a new round.`,
				);
			}

			result.round += spanHeight / Math.max(1, roundValidators);
			result.roundHeight = nextMilestone.height;
			assert.number(nextMilestone.data);
			result.maxValidators = nextMilestone.data;

			roundValidators = nextMilestone.data;
			milestoneHeight = nextMilestone.height - 1;

			nextMilestone = this.configuration.getNextMilestoneWithNewKey(nextMilestone.height, "roundValidators");
		}

		const minRoundValidators = Math.max(1, roundValidators);
		const heightFromLastSpan = height - milestoneHeight - 1;
		const roundIncrease = Math.floor(heightFromLastSpan / minRoundValidators);
		const nextRoundIncrease = (heightFromLastSpan + 1) % minRoundValidators === 0 ? 1 : 0;

		result.round += roundIncrease;
		result.roundHeight += roundIncrease * minRoundValidators;
		result.nextRound = result.round + nextRoundIncrease;
		result.maxValidators = minRoundValidators;

		return result;
	}

	public calculateRoundInfoByRound(round: number): Contracts.Shared.RoundInfo {
		// Genesis round requires special treatment
		if (round === 0) {
			return { maxValidators: 0, nextRound: 1, round: 0, roundHeight: 0 };
		}

		const milestones = this.configuration.getMilestones();

		let roundHeight = 1;
		let maxValidators = 0;
		for (let index = 1; index < milestones.length - 1; index++) {
			const milestone = milestones[index];
			maxValidators = milestone.roundValidators;
			roundHeight += (round - 1) * milestone.roundValidators;
		}

		return {
			maxValidators,
			nextRound: round,
			round,
			roundHeight,
		};
	}

	public getMilestonesWhichAffectActiveValidatorCount = (
		configuration: Contracts.Crypto.Configuration,
	): Array<MilestoneSearchResult> => {
		const genesisHeight = this.configuration.getGenesisHeight();

		const milestones: Array<MilestoneSearchResult> = [
			{
				data: configuration.getMilestone(genesisHeight).roundValidators,
				found: true,
				height: genesisHeight,
			},
		];

		let nextMilestone = configuration.getNextMilestoneWithNewKey(genesisHeight, "roundValidators");

		while (nextMilestone.found) {
			milestones.push(nextMilestone);
			nextMilestone = configuration.getNextMilestoneWithNewKey(nextMilestone.height, "roundValidators");
		}

		return milestones;
	};
}
