import type { CommitJsonCrypto } from "./commit.js";
import type {
	Milestone,
	MilestoneDiff,
	MilestoneKey,
	MilestoneSearchResult,
	Network,
	NetworkConfig,
	NetworkConfigPartial,
} from "./networks.js";

export interface Configuration {
	setConfig(config: NetworkConfigPartial, verify?: boolean): void;

	all(): NetworkConfig;

	set<T = unknown>(key: string, value: T): void;

	getGenesisCommit(): CommitJsonCrypto;

	getNetwork(): Network;

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

	getMaxRoundValidators(): number;
}
