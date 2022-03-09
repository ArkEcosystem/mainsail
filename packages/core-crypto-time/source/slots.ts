import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import dayjs from "dayjs";

import { BlockTimeCalculator } from "./block-time-calculator";
import { BlockTimeLookup } from "./block-time-lookup";

@injectable()
export class Slots implements Contracts.Crypto.Slots {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Time.BlockTimeCalculator)
	private readonly calculator: BlockTimeCalculator;

	@inject(Identifiers.Cryptography.Time.BlockTimeLookup)
	private readonly blockTimeLookup: BlockTimeLookup;

	#transientBlockTimeLookup: Contracts.Crypto.GetBlockTimeStampLookup | undefined;

	public withBlockTimeLookup(callback: Contracts.Crypto.GetBlockTimeStampLookup): Slots {
		this.#transientBlockTimeLookup = callback;

		return this;
	}

	public getTime(time?: number): number {
		return time ?? dayjs().unix();
	}

	public async getTimeInMsUntilNextSlot(): Promise<number> {
		const nextSlotTime: number = await this.getSlotTime(await this.getNextSlot());
		const now: number = this.getTime();

		return (nextSlotTime - now) * 1000;
	}

	public async getSlotNumber(timestamp?: number, height?: number): Promise<number> {
		const { slotNumber } = await this.getSlotInfo(timestamp ?? this.getTime(), this.#getLatestHeight(height));

		this.#transientBlockTimeLookup = undefined;

		return slotNumber;
	}

	public async getSlotTime(slot: number, height?: number): Promise<number> {
		return this.#calculateSlotTime(slot, this.#getLatestHeight(height));
	}

	public async getNextSlot(): Promise<number> {
		return (await this.getSlotNumber()) + 1;
	}

	public async isForgingAllowed(timestamp?: number, height?: number): Promise<boolean> {
		return (await this.getSlotInfo(timestamp ?? this.getTime(), this.#getLatestHeight(height))).forgingStatus;
	}

	public async getSlotInfo(timestamp?: number, height?: number): Promise<Contracts.Crypto.SlotInfo> {
		if (timestamp === undefined) {
			timestamp = this.getTime();
		}

		height = this.#getLatestHeight(height);

		let blockTime = this.calculator.calculateBlockTime(1);
		let totalSlotsFromLastSpan = 0;
		let lastSpanEndTime = dayjs(this.configuration.getMilestone().epoch).unix();
		let previousMilestoneHeight = 1;
		let nextMilestone = this.configuration.getNextMilestoneWithNewKey(1, "blocktime");

		for (let index = 0; index < this.getMilestonesWhichAffectBlockTimes().length - 1; index++) {
			if (height < nextMilestone.height) {
				break;
			}

			const spanStartTimestamp = await this.#getBlockTimeLookup(previousMilestoneHeight);
			lastSpanEndTime = (await this.#getBlockTimeLookup(nextMilestone.height - 1)) + blockTime;
			totalSlotsFromLastSpan += Math.floor((lastSpanEndTime - spanStartTimestamp) / blockTime);

			blockTime = nextMilestone.data;
			previousMilestoneHeight = nextMilestone.height;
			nextMilestone = this.configuration.getNextMilestoneWithNewKey(nextMilestone.height, "blocktime");
		}

		const slotNumberUpUntilThisTimestamp = Math.floor((timestamp - lastSpanEndTime) / blockTime);
		const slotNumber = totalSlotsFromLastSpan + slotNumberUpUntilThisTimestamp;
		const startTime = lastSpanEndTime + slotNumberUpUntilThisTimestamp * blockTime;
		const endTime = startTime + blockTime - 1;
		const forgingStatus = timestamp < startTime + Math.floor(blockTime / 2);

		return {
			blockTime,
			endTime,
			forgingStatus,
			slotNumber,
			startTime,
		};
	}

	public getMilestonesWhichAffectBlockTimes(): Array<Contracts.Crypto.MilestoneSearchResult> {
		const milestones: Array<Contracts.Crypto.MilestoneSearchResult> = [
			{
				data: this.configuration.getMilestone(1).blocktime,
				found: true,
				height: 1,
			},
		];

		let nextMilestone = this.configuration.getNextMilestoneWithNewKey(1, "blocktime");

		while (nextMilestone.found) {
			milestones.push(nextMilestone);
			nextMilestone = this.configuration.getNextMilestoneWithNewKey(nextMilestone.height, "blocktime");
		}

		return milestones;
	}

	async #calculateSlotTime(slotNumber: number, height: number): Promise<number> {
		let blockTime = this.calculator.calculateBlockTime(1);
		let totalSlotsFromLastSpan = 0;
		let milestoneHeight = 1;
		let lastSpanEndTime = dayjs(this.configuration.getMilestone().epoch).unix();

		let nextMilestone = this.configuration.getNextMilestoneWithNewKey(1, "blocktime");

		for (let index = 0; index < this.getMilestonesWhichAffectBlockTimes().length - 1; index++) {
			if (height < nextMilestone.height) {
				break;
			}

			const spanStartTimestamp = await this.#getBlockTimeLookup(milestoneHeight);
			lastSpanEndTime = (await this.#getBlockTimeLookup(nextMilestone.height - 1)) + blockTime;
			totalSlotsFromLastSpan += Math.floor((lastSpanEndTime - spanStartTimestamp) / blockTime);

			blockTime = nextMilestone.data;
			milestoneHeight = nextMilestone.height;
			nextMilestone = this.configuration.getNextMilestoneWithNewKey(nextMilestone.height, "blocktime");
		}

		return lastSpanEndTime + (slotNumber - totalSlotsFromLastSpan) * blockTime;
	}

	#getLatestHeight(height: number | undefined): number {
		if (height) {
			return height;
		}

		if (this.configuration.getHeight()) {
			return this.configuration.getHeight();
		}

		return 1;
	}

	async #getBlockTimeLookup(height: number): Promise<number> {
		if (typeof this.#transientBlockTimeLookup === "function") {
			return this.#transientBlockTimeLookup(height);
		}

		return this.blockTimeLookup.getBlockTimeLookup(height);
	}
}
