import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class MemoryDatabase implements Contracts.Database.DatabaseService {
	async initialize(): Promise<void> {}

	#commits: Contracts.Crypto.Commit[] = [];

	public isEmpty(): boolean {
		return this.#commits.length === 0;
	}

	public addCommit(commit: Contracts.Crypto.Commit): void {
		this.#commits.push(commit);
	}

	// NOTE: genesis block is not part of commits, so start is offset by 1!
	public async findBlocks(start: number, end: number): Promise<Contracts.Crypto.Block[]> {
		return this.#commits.slice(Math.max(start, 0), Math.max(start, end)).map((commit) => commit.block);
	}

	public async findCommitBuffers(start: number, end: number): Promise<Buffer[]> {
		return this.#commits
			.slice(Math.max(start, 0), Math.max(start, end))
			.map((commit) => Buffer.from(commit.serialized));
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

	getState(): Contracts.Database.State {
		throw new Error("Method not implemented.");
	}

	getCommitById(id: string): Promise<Contracts.Crypto.Commit | undefined> {
		throw new Error("Method not implemented.");
	}
	hasCommitById(id: string): boolean {
		throw new Error("Method not implemented.");
	}

	getBlock(height: number): Promise<Contracts.Crypto.Block | undefined> {
		throw new Error("Method not implemented.");
	}

	getBlockById(id: string): Promise<Contracts.Crypto.Block | undefined> {
		throw new Error("Method not implemented.");
	}
	getBlockHeader(height: number): Promise<Contracts.Crypto.BlockHeader | undefined> {
		throw new Error("Method not implemented.");
	}
	getBlockHeaderById(id: string): Promise<Contracts.Crypto.BlockHeader | undefined> {
		throw new Error("Method not implemented.");
	}
	getTransactionById(id: string): Promise<Contracts.Crypto.Transaction | undefined> {
		throw new Error("Method not implemented.");
	}
	getTransactionByBlockIdAndIndex(blockId: string, index: number): Promise<Contracts.Crypto.Transaction | undefined> {
		throw new Error("Method not implemented.");
	}
	getTransactionByBlockHeightAndIndex(
		height: number,
		index: number,
	): Promise<Contracts.Crypto.Transaction | undefined> {
		throw new Error("Method not implemented.");
	}
}
