import { IMilestone, MilestoneSearchResult, NetworkConfig } from "@arkecosystem/crypto-contracts";
import { InvalidMilestoneConfigurationError } from "@arkecosystem/crypto-errors";
import deepmerge from "deepmerge";
import get from "lodash.get";
import set from "lodash.set";

export class Configuration {
	readonly #networks: Record<string, NetworkConfig>;
	#config: NetworkConfig | undefined;
	#height: number | undefined;
	#milestone: IMilestone | undefined;
	#milestones: Record<string, any> | undefined;

	public constructor(networks: Record<string, NetworkConfig>) {
		this.#networks = networks;

		this.setConfig(networks.devnet as unknown as NetworkConfig);
	}

	public setConfig(config: NetworkConfig): void {
		this.#config = {
			exceptions: config.exceptions,
			genesisBlock: config.genesisBlock,
			milestones: config.milestones,
			network: config.network,
		};

		this.validateMilestones();
		this.buildConstants();
	}

	public setFromPreset(network: string): void {
		this.setConfig(this.getPreset(network));
	}

	public getPreset(network: string): NetworkConfig {
		return this.#networks[network.toLowerCase()];
	}

	public all(): NetworkConfig | undefined {
		return this.#config;
	}

	public set<T = any>(key: string, value: T): void {
		if (!this.#config) {
			throw new Error();
		}

		set(this.#config, key, value);
	}

	public get<T = any>(key: string): T {
		return get(this.#config, key);
	}

	public setHeight(value: number): void {
		this.#height = value;
	}

	public getHeight(): number | undefined {
		return this.#height;
	}

	public isNewMilestone(height?: number): boolean {
		height = height || this.#height;

		if (!this.#milestones) {
			throw new Error();
		}

		return this.#milestones.some((milestone) => milestone.height === height);
	}

	public getMilestone(height?: number): { [key: string]: any } {
		if (!this.#milestone || !this.#milestones) {
			throw new Error();
		}

		if (!height && this.#height) {
			height = this.#height;
		}

		if (!height) {
			height = 1;
		}

		while (
			this.#milestone.index < this.#milestones.length - 1 &&
			height >= this.#milestones[this.#milestone.index + 1].height
		) {
			this.#milestone.index++;
			this.#milestone.data = this.#milestones[this.#milestone.index];
		}

		while (height < this.#milestones[this.#milestone.index].height) {
			this.#milestone.index--;
			this.#milestone.data = this.#milestones[this.#milestone.index];
		}

		return this.#milestone.data;
	}

	public getNextMilestoneWithNewKey(previousMilestone: number, key: string): MilestoneSearchResult {
		if (!this.#milestones || this.#milestones.length === 0) {
			throw new Error(`Attempted to get next milestone but none were set`);
		}

		for (let index = 0; index < this.#milestones.length; index++) {
			const milestone = this.#milestones[index];
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

	public getMilestones(): any {
		return this.#milestones;
	}

	private buildConstants(): void {
		if (!this.#config) {
			throw new Error();
		}

		this.#milestones = this.#config.milestones.sort((a, b) => a.height - b.height);
		this.#milestone = {
			data: this.#milestones[0],
			index: 0,
		};

		let lastMerged = 0;

		const overwriteMerge = (destination, source, options) => source;

		while (lastMerged < this.#milestones.length - 1) {
			this.#milestones[lastMerged + 1] = deepmerge(
				this.#milestones[lastMerged],
				this.#milestones[lastMerged + 1],
				{
					arrayMerge: overwriteMerge,
				},
			);
			lastMerged++;
		}
	}

	private validateMilestones(): void {
		if (!this.#config) {
			throw new Error();
		}

		const delegateMilestones = this.#config.milestones
			.sort((a, b) => a.height - b.height)
			.filter((milestone) => milestone.activeDelegates);

		for (let index = 1; index < delegateMilestones.length; index++) {
			const previous = delegateMilestones[index - 1];
			const current = delegateMilestones[index];

			if (previous.activeDelegates === current.activeDelegates) {
				continue;
			}

			if ((current.height - previous.height) % previous.activeDelegates !== 0) {
				throw new InvalidMilestoneConfigurationError(
					`Bad milestone at height: ${current.height}. The number of delegates can only be changed at the beginning of a new round.`,
				);
			}
		}
	}
}
