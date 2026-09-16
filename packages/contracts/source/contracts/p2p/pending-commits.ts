import type { Commit } from "../crypto/index.js";

export interface PendingCommits {
	add(commits: Commit[]): void;
	take(blockNumber: number): Commit | undefined;
	has(blockNumber: number): boolean;
	clear(): void;
}
