import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { InvalidMilestoneConfigurationError, InvalidNumberOfRoundValidatorsError } from "@mainsail/exceptions";
import { assert } from "@mainsail/utils";
import deepmerge from "deepmerge";
import clone from "lodash.clone";
import get from "lodash.get";
import set from "lodash.set";

type Config = {
	config: Contracts.Crypto.NetworkConfig;
	milestone: { data: Contracts.Crypto.Milestone; index: number };
};

@injectable()
export class Configuration implements Contracts.Crypto.Configuration {
	#configuration: Config | undefined = undefined;
	#originalMilestones: Contracts.Crypto.MilestonePartial[] | undefined;
	#height = 0;

	public setConfig(config: Contracts.Crypto.NetworkConfigPartial): void {
		this.#originalMilestones = clone(config.milestones);
		this.#height = config.genesisBlock.block.number;

		this.#buildConstants(config);
	}

	public all(): Contracts.Crypto.NetworkConfig | undefined {
		return this.#configuration?.config;
	}

	public set<T = unknown>(key: string, value: T): void {
		assert.defined(this.#configuration);
		set(this.#configuration.config, key, clone(value));

		this.#buildConstants(this.#configuration.config);
	}

	public get<T = unknown>(key: string): T {
		return get(this.#configuration?.config, key);
	}

	public setHeight(value: number): void {
		this.#height = value;
	}

	public getHeight(): number {
		return this.#height;
	}

	public getGenesisHeight(): number {
		assert.defined(this.#configuration);
		return this.#configuration.config.genesisBlock.block.number;
	}

	public isNewMilestone(height?: number): boolean {
		assert.defined(this.#configuration);

		if (height === undefined) {
			height = this.#height;
		}

		return this.#configuration.config.milestones.some((milestone) => milestone.height === height);
	}



	public getMilestone(height?: number): Contracts.Crypto.Milestone {
		assert.defined(this.#configuration);

		if (height === undefined) {
			height = this.#height;
		}

		const milestones = this.#configuration.config.milestones;
		const milestone = this.#configuration.milestone;

		while (milestone.index < milestones.length - 1 && height >= milestones[milestone.index + 1].height) {
			milestone.index++;
			milestone.data = milestones[milestone.index];
		}

		while (height < milestones[milestone.index].height) {
			milestone.index--;
			milestone.data = milestones[milestone.index];
		}

		return milestone.data;
	}

	public getMilestoneDiff(height?: number): Contracts.Crypto.MilestoneDiff {
		if (!this.#originalMilestones) {
			return {};
		}

		if (height === undefined) {
			height = this.#height;
		}

		const milestoneIndex = this.#originalMilestones?.findIndex((milestone) => milestone.height === height) ?? -1;
		if (milestoneIndex <= 0) {
			return {};
		}

		const currentMilestone = this.#originalMilestones[milestoneIndex];
		const previousMilestone = this.#originalMilestones[milestoneIndex - 1];

		const diff = {};
		for (const [key, value] of Object.entries(currentMilestone)) {
			diff[key] = `${previousMilestone[key]} => ${value}`;
		}

		return diff;
	}

	public getNextMilestoneWithNewKey<K extends Contracts.Crypto.MilestoneKey>(
		previousMilestone: number,
		key: K,
	): Contracts.Crypto.MilestoneSearchResult<Contracts.Crypto.Milestone[K]> {
		assert.defined(this.#configuration);

		const milestones = this.#configuration.config.milestones;

		for (let index = 0; index < milestones.length; index++) {
			const milestone = milestones[index];
			if (
				milestone[key] &&
				milestone[key] !== this.getMilestone(previousMilestone)[key] &&
				milestone.height > previousMilestone
			) {
				return {
					data: milestone[key],
					found: true,
					height: milestone.height,
				};
			}
		}

		return {
			data: null,
			found: false,
			height: previousMilestone,
		};
	}

	public getMilestones(): Contracts.Crypto.Milestone[] {
		assert.defined(this.#configuration);
		return this.#configuration.config.milestones;
	}

	public getMaxRoundValidators(): number {
		assert.defined(this.#configuration);
		return Math.max(...this.#configuration.config.milestones.map((milestone) => milestone.roundValidators));
	}

	#buildConstants(config: Contracts.Crypto.NetworkConfigPartial): void {
		this.#checkRoundValidators(config);

		const buildConfig = {
			genesisBlock: clone(config.genesisBlock),
			milestones: this.#buildMilestones(config),
			network: clone(config.network),
		}

		this.#configuration = {
			config: buildConfig,
			milestone: {
				data: buildConfig.milestones[0],
				index: 0,
			},
		};
	}

	#buildMilestones(config: Contracts.Crypto.NetworkConfigPartial): Contracts.Crypto.Milestone[] {
		const milestones = clone(config.milestones) as Contracts.Crypto.Milestone[];
		milestones.sort((a, b) => a.height - b.height)

		let lastMerged = 0;
		while (lastMerged < milestones.length - 1) {
			milestones[lastMerged + 1] = deepmerge(milestones[lastMerged], milestones[lastMerged + 1], {
				arrayMerge: (destination, source, options) => source,
			});

			lastMerged++;
		}

		return milestones;
	}

	#checkRoundValidators(config: Contracts.Crypto.NetworkConfigPartial): void {
		const initialHeight = config.genesisBlock.block.number;

		const milestones = config.milestones
			.sort((a, b) => a.height - b.height)
			.filter((milestone) => milestone.roundValidators !== undefined);

		for (let index = 0; index < milestones.length; index++) {
			const current = milestones[index];
			if (current.height > initialHeight && current.roundValidators === 0) {
				throw new InvalidNumberOfRoundValidatorsError(
					`Bad milestone at height: ${current.height}. The number of validators must be greater than 0.`,
				);
			}

			// Can't get previous milestone for the first milestone, so skip it
			if (index === 0) {
				continue;
			}

			const previous = milestones[index - 1];
			assert.defined(previous.roundValidators);

			// Skip genesis milestone with 0  round validators
			if (previous.height === initialHeight && previous.roundValidators === 0) {
				continue;
			}

			// Skip on no change
			if (previous.roundValidators === current.roundValidators) {
				continue;
			}

			if ((current.height - Math.max(previous.height, 1)) % previous.roundValidators !== 0) {
				throw new InvalidMilestoneConfigurationError(
					`Bad milestone at height: ${current.height}. The number of validators can only be changed at the beginning of a new round.`,
				);
			}
		}
	}
}
