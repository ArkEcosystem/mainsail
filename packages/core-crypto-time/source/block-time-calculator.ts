import { Container } from "@arkecosystem/core-container";
import { Crypto, Identifiers } from "@arkecosystem/core-contracts";

@Container.injectable()
export class BlockTimeCalculator {
	@Container.inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Crypto.IConfiguration;

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

			if (!milestone || temporary.blocktime === milestone.blocktime) {
				if (temporary.blocktime) {
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
			if (milestone.height <= height && milestone.blocktime) {
				return milestone.blocktime;
			}
		}

		throw new Error(`No milestones specifying any height were found`);
	}
}
