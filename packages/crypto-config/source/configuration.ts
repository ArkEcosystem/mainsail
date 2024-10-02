import { inject,injectable } from "@mainsail/container";
import { Contracts, Events,Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import deepmerge from "deepmerge";
import clone from "lodash.clone";
import get from "lodash.get";
import set from "lodash.set";
@injectable()
export class Configuration implements Contracts.Crypto.Configuration {
	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	#config: Contracts.Crypto.NetworkConfig | undefined;
	#milestone: { data: Contracts.Crypto.Milestone; index: number } | undefined;
	#milestones: Contracts.Crypto.Milestone[] | undefined;
	#originalMilestones: Contracts.Crypto.MilestonePartial[] | undefined;
	#height = 0;
	#maxActiveValidators = 0;

	public setConfig(config: Contracts.Crypto.NetworkConfigPartial): void {
		this.#config = {
			genesisBlock: clone(config.genesisBlock),
			milestones: clone(config.milestones) as Contracts.Crypto.Milestone[],
			network: clone(config.network),
		};

		this.#validateMilestones();
		this.#buildConstants();

		this.#originalMilestones = config.milestones;
	}

	public all(): Contracts.Crypto.NetworkConfig | undefined {
		return this.#config;
	}

	public set<T = any>(key: string, value: T): void {
		if (!this.#config) {
			this.#config = {
				// @ts-ignore
				genesisBlock: {},
				// @ts-ignore
				milestones: {},
				// @ts-ignore
				network: {},
			};
		}

		Utils.assert.defined<Contracts.Crypto.NetworkConfig>(this.#config);
		set(this.#config, key, clone(value));

		try {
			this.#validateMilestones();

			this.#buildConstants();

			this.#originalMilestones = (value as any).milestones;
		} catch {
			//
		}
	}

	public get<T = any>(key: string): T {
		return get(this.#config, key);
	}

	public setHeight(value: number): void {
		this.#height = value;

		if (this.isNewMilestone()) {
			console.trace();

			this.logger.notice(`Milestone change: ${JSON.stringify(this.getMilestoneDiff())}`);

			void this.events.dispatch(Events.CryptoEvent.MilestoneChanged);
		}
	}

	public getHeight(): number {
		return this.#height;
	}

	public isNewMilestone(height?: number): boolean {
		if (height === undefined) {
			height = this.#height;
		}

		if (!this.#milestones) {
			throw new Error();
		}

		return this.#milestones.some((milestone) => milestone.height === height);
	}

	public getMilestone(height?: number): Contracts.Crypto.Milestone {
		if (!this.#milestone || !this.#milestones) {
			throw new Error();
		}

		if (height === undefined) {
			height = this.#height;
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

	public getMaxActiveValidators(): number {
		Utils.assert.defined<number>(this.#maxActiveValidators);
		return this.#maxActiveValidators;
	}

	#buildConstants(): void {
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

		this.#maxActiveValidators = this.#milestone.data?.activeValidators ?? 0;

		while (lastMerged < this.#milestones.length - 1) {
			this.#milestones[lastMerged + 1] = deepmerge(
				this.#milestones[lastMerged],
				this.#milestones[lastMerged + 1],
				{
					arrayMerge: overwriteMerge,
				},
			);

			this.#maxActiveValidators = Math.max(
				this.#maxActiveValidators ?? 0,
				this.#milestones[lastMerged].activeValidators,
				this.#milestones[lastMerged + 1].activeValidators,
			);

			lastMerged++;
		}
	}

	#validateMilestones(): void {
		if (!this.#config) {
			throw new Error();
		}

		const validatorMilestones = this.#config.milestones
			.sort((a, b) => a.height - b.height)
			.filter((milestone) => milestone.activeValidators !== undefined);

		for (let index = 0; index < validatorMilestones.length; index++) {
			const current = validatorMilestones[index];
			if (current.height > 0 && current.activeValidators === 0) {
				throw new Exceptions.InvalidNumberOfActiveValidatorsError(
					`Bad milestone at height: ${current.height}. The number of validators must be greater than 0.`,
				);
			}

			if (index === 0) {
				continue;
			}

			const previous = validatorMilestones[index - 1];

			if (previous.activeValidators === current.activeValidators) {
				continue;
			}

			if (previous.height === 0 && previous.activeValidators === 0) {
				continue;
			}

			if ((current.height - Math.max(previous.height, 1)) % previous.activeValidators !== 0) {
				throw new Exceptions.InvalidMilestoneConfigurationError(
					`Bad milestone at height: ${current.height}. The number of validators can only be changed at the beginning of a new round.`,
				);
			}
		}
	}
}
