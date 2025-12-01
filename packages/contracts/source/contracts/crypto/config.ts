import type {
	Milestone,
	MilestoneDiff,
	MilestoneKey,
	MilestoneSearchResult,
	NetworkConfig,
	NetworkConfigPartial,
} from "./networks.js";

export interface Configuration {
	setConfig(config: NetworkConfigPartial): void;

	all(): NetworkConfig | undefined;

	set<T = unknown>(key: string, value: T): void;

	get<T = unknown>(key: string): T;

	setHeight(value: number): void;

	getHeight(): number;

	getGenesisHeight(): number;

	isNewMilestone(height?: number): boolean;

	getMilestone(height?: number): Milestone;

	getMilestoneDiff(height?: number): MilestoneDiff;

	getNextMilestoneWithNewKey<K extends MilestoneKey>(
		previousMilestone: number,
		key: K,
	): MilestoneSearchResult<Milestone[K]>;

	getMilestones(): Milestone[];

	getRoundValidators(): number;
}
