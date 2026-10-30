import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";

@injectable()
export class PendingCommits implements Contracts.P2P.PendingCommits {
	readonly #commits = new Map<number, Contracts.Crypto.Commit>();

	public add(commits: Contracts.Crypto.Commit[]): void {
		for (const commit of commits) {
			this.#commits.set(commit.block.number, commit);
		}
	}

	public take(blockNumber: number): Contracts.Crypto.Commit | undefined {
		const commit = this.#commits.get(blockNumber);
		this.#commits.delete(blockNumber);

		return commit;
	}

	public has(blockNumber: number): boolean {
		return this.#commits.has(blockNumber);
	}

	public clear(): void {
		this.#commits.clear();
	}
}
