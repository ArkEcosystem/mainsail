import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class Store implements Contracts.State.Store {
	#genesisBlock?: Contracts.Crypto.Commit;
	#lastBlock?: Contracts.Crypto.Block;
	#height = 0;
	#totalRound = 0;

	public setGenesisCommit(block: Contracts.Crypto.Commit): void {
		this.#genesisBlock = block;
	}

	public getGenesisCommit(): Contracts.Crypto.Commit {
		Utils.assert.defined<Contracts.Crypto.Commit>(this.#genesisBlock);

		return this.#genesisBlock;
	}

	public setLastBlock(block: Contracts.Crypto.Block): void {
		this.#height = block.data.height;
		this.#lastBlock = block;
	}

	public getLastBlock(): Contracts.Crypto.Block {
		Utils.assert.defined<Contracts.Crypto.Block>(this.#lastBlock);
		return this.#lastBlock;
	}

	// Set height is used on workers, because last block is not transferred
	public setHeight(height: number): void {
		this.#height = height;
	}

	public getHeight(): number {
		return this.#height;
	}

	public setTotalRound(totalRound: number): void {
		this.#totalRound = totalRound;
	}

	public getTotalRound(): number {
		return this.#totalRound;
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		this.setLastBlock(unit.getBlock());
		this.#totalRound += unit.round + 1;
	}
}
