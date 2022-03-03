import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import dayjs from "dayjs";

import { BlockTimeCalculator } from "./block-time-calculator";

export interface SlotInfo {
	startTime: number;
	endTime: number;
	blockTime: number;
	slotNumber: number;
	forgingStatus: boolean;
}

export type GetBlockTimeStampLookup = (blockheight: number) => number;

@injectable()
export class Slots {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Time.BlockTimeCalculator)
	private readonly calculator: BlockTimeCalculator;

	public getTime(time?: number): number {
		if (time === undefined) {
			return dayjs().valueOf();
		}

		return time;
	}

	public getTimeInMsUntilNextSlot(getTimeStampForBlock: GetBlockTimeStampLookup): number {
		const nextSlotTime: number = this.getSlotTime(getTimeStampForBlock, this.getNextSlot(getTimeStampForBlock));
		const now: number = this.getTime();

		return (nextSlotTime - now) * 1000;
	}

	public getSlotNumber(getTimeStampForBlock: GetBlockTimeStampLookup, timestamp?: number, height?: number): number {
		if (timestamp === undefined) {
			timestamp = this.getTime();
		}

		return this.getSlotInfo(getTimeStampForBlock, timestamp, this.getLatestHeight(height)).slotNumber;
	}

	public getSlotTime(getTimeStampForBlock: GetBlockTimeStampLookup, slot: number, height?: number): number {
		return this.calculateSlotTime(slot, this.getLatestHeight(height), getTimeStampForBlock);
	}

	public getNextSlot(getTimeStampForBlock: GetBlockTimeStampLookup): number {
		return this.getSlotNumber(getTimeStampForBlock) + 1;
	}

	public isForgingAllowed(
		getTimeStampForBlock: GetBlockTimeStampLookup,
		timestamp?: number,
		height?: number,
	): boolean {
		if (timestamp === undefined) {
			timestamp = this.getTime();
		}

		return this.getSlotInfo(getTimeStampForBlock, timestamp, this.getLatestHeight(height)).forgingStatus;
	}

	public getSlotInfo(getTimeStampForBlock: GetBlockTimeStampLookup, timestamp?: number, height?: number): SlotInfo {
		if (timestamp === undefined) {
			timestamp = this.getTime();
		}

		height = this.getLatestHeight(height);

		let blockTime = this.calculator.calculateBlockTime(1);
		let totalSlotsFromLastSpan = 0;
		let lastSpanEndTime = 0;
		let previousMilestoneHeight = 1;
		let nextMilestone = this.configuration.getNextMilestoneWithNewKey(1, "blocktime");

		for (let index = 0; index < this.getMilestonesWhichAffectBlockTimes().length - 1; index++) {
			if (height < nextMilestone.height) {
				break;
			}

			const spanStartTimestamp = getTimeStampForBlock(previousMilestoneHeight);
			lastSpanEndTime = getTimeStampForBlock(nextMilestone.height - 1) + blockTime;
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

	private calculateSlotTime(
		slotNumber: number,
		height: number,
		getTimeStampForBlock: GetBlockTimeStampLookup,
	): number {
		let blockTime = this.calculator.calculateBlockTime(1);
		let totalSlotsFromLastSpan = 0;
		let milestoneHeight = 1;
		let lastSpanEndTime = 0;

		let nextMilestone = this.configuration.getNextMilestoneWithNewKey(1, "blocktime");

		for (let index = 0; index < this.getMilestonesWhichAffectBlockTimes().length - 1; index++) {
			if (height < nextMilestone.height) {
				break;
			}

			const spanStartTimestamp = getTimeStampForBlock(milestoneHeight);
			lastSpanEndTime = getTimeStampForBlock(nextMilestone.height - 1) + blockTime;
			totalSlotsFromLastSpan += Math.floor((lastSpanEndTime - spanStartTimestamp) / blockTime);

			blockTime = nextMilestone.data;
			milestoneHeight = nextMilestone.height;
			nextMilestone = this.configuration.getNextMilestoneWithNewKey(nextMilestone.height, "blocktime");
		}

		return lastSpanEndTime + (slotNumber - totalSlotsFromLastSpan) * blockTime;
	}

	private getLatestHeight(height: number | undefined): number {
		if (!height) {
			// TODO: is the config manager the best way to retrieve most recent height?
			// Or should this class maintain its own cache?
			const configConfiguredHeight = this.configuration.getHeight();

			if (configConfiguredHeight) {
				return configConfiguredHeight;
			}

			return 1;
		}

		return height;
	}
}
