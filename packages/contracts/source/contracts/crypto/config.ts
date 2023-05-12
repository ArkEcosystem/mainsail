import { Milestone, MilestoneKey, MilestoneSearchResult, NetworkConfig, NetworkConfigPartial } from "./networks";

export interface IConfiguration {
	setConfig(config: NetworkConfigPartial): void;

	all(): NetworkConfig | undefined;

	set<T = any>(key: string, value: T): void;

	get<T = any>(key: string): T;

	setHeight(value: number): void;

	getHeight(): number | undefined;

	isNewMilestone(height?: number): boolean;

	getMilestone(height?: number): Milestone;

	getNextMilestoneWithNewKey<K extends MilestoneKey>(
		previousMilestone: number,
		key: K,
	): MilestoneSearchResult<Milestone[K]>;

	getMilestones(): any;
}
