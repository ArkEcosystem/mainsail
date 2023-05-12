import { Milestone, MilestoneSearchResult } from "./networks";

export interface SlotInfo {
	startTime: number;
	endTime: number;
	blockTime: number;
	slotNumber: number;
	forgingStatus: boolean;
}

export type GetBlockTimeStampLookup = (blockheight: number) => number;

export interface Slots {
	withBlockTimeLookup(callback: GetBlockTimeStampLookup): Slots;

	getTime(time?: number): number;

	getTimeInMsUntilNextSlot(): Promise<number>;

	getSlotNumber(timestamp?: number, height?: number): Promise<number>;

	getSlotTime(slot: number, height?: number): Promise<number>;

	getNextSlot(): Promise<number>;

	isForgingAllowed(timestamp?: number, height?: number): Promise<boolean>;

	getSlotInfo(timestamp?: number, height?: number): Promise<SlotInfo>;

	getMilestonesWhichAffectBlockTimes(): Array<MilestoneSearchResult<Milestone["blockTime"]>>;
}
