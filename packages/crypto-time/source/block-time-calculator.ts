export class BlockTimeCalculator {
	readonly #configManager: any;

	public constructor(configManager) {
		this.#configManager = configManager;
	}

	public isNewBlockTime(height: number): boolean {
		if (height === 1) {
			return true;
		}

		const milestones = this.#configManager.get("milestones");

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
		const milestones = this.#configManager.get("milestones");

		for (let i = milestones.length - 1; i >= 0; i--) {
			const milestone = milestones[i];
			if (milestone.height <= height && milestone.blocktime) {
				return milestone.blocktime;
			}
		}

		throw new Error(`No milestones specifying any height were found`);
	}
}
