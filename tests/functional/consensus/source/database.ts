import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class MemoryDatabase implements Contracts.Database.DatabaseService {
	#commits: Contracts.Crypto.Commit[] = [];

	public isEmpty(): boolean {
		return this.#commits.length === 0;
	}

	public addCommit(commit: Contracts.Crypto.Commit): void {
		this.#commits.push(commit);
	}

	public async findBlocks(start: number, end: number): Promise<Contracts.Crypto.Block[]> {
		return this.#commits.slice(start, end).map((commit) => commit.block);
	}

	public async findCommitBuffers(start: number, end: number): Promise<Buffer[]> {
		return this.#commits.slice(start, end).map((commit) => Buffer.from(commit.serialized));
	}

	public async getCommit(height: number): Promise<Contracts.Crypto.Commit | undefined> {
		return this.#commits[height];
	}

	public async getLastCommit(): Promise<Contracts.Crypto.Commit> {
		if (this.#commits.length === 0) {
			throw new Error("Database is empty");
		}

		return this.#commits.at(-1)!;
	}

	public async *readCommits(start: number, end: number): AsyncGenerator<Contracts.Crypto.Commit> {
		for (let index = start; index < end; index++) {
			yield this.#commits[index];
		}
	}

	public async persist(): Promise<void> {
		// Nothing to do here
	}
}
