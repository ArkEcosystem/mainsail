import { Container } from "@arkecosystem/container";
import { BINDINGS, IConfiguration } from "@arkecosystem/core-crypto-contracts";

@Container.injectable()
export class BlockTimeCalculator {
	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: IConfiguration;

	public isNewBlockTime(height: number): boolean {
		if (height === 1) {
			return true;
		}

		const milestones = this.configuration.get("milestones");

		let milestone;

		for (let i = milestones.length - 1; i >= 0; i--) {
			const temp = milestones[i];

			if (temp.height > height) {
				continue;
			}

			if (!milestone || temp.blocktime === milestone.blocktime) {
				if (temp.blocktime) {
					milestone = temp;
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

		for (let i = milestones.length - 1; i >= 0; i--) {
			const milestone = milestones[i];
			if (milestone.height <= height && milestone.blocktime) {
				return milestone.blocktime;
			}
		}

		throw new Error(`No milestones specifying any height were found`);
	}
}
