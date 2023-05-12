import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class BlockTimeCalculator {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	public isNewBlockTime(height: number): boolean {
		if (height === 1) {
			return true;
		}

		const milestones = this.configuration.get("milestones");

		let milestone;

		for (let index = milestones.length - 1; index >= 0; index--) {
			const temporary = milestones[index];

			if (temporary.height > height) {
				continue;
			}

			if (!milestone || temporary.blockTime === milestone.blockTime) {
				if (temporary.blockTime) {
					milestone = temporary;
				}
			} else {
				break;
			}
		}

		if (!milestone) {
			return false;
		}

		return height - milestone.height === 0;
	}

	public calculateBlockTime(height: number): number {
		const milestones = this.configuration.get("milestones");

		for (let index = milestones.length - 1; index >= 0; index--) {
			const milestone = milestones[index];
			if (milestone.height <= height && milestone.blockTime) {
				return milestone.blockTime;
			}
		}

		throw new Error(`No milestones specifying any height were found`);
	}
}
