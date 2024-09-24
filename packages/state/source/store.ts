import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class Store implements Contracts.State.Store {
	#genesisBlock?: Contracts.Crypto.Commit;
	#lastBlock?: Contracts.Crypto.Block;
	#height = 0;
	#totalRound = 0;

	public getGenesisCommit(): Contracts.Crypto.Commit {
		Utils.assert.defined<Contracts.Crypto.Commit>(this.#genesisBlock);

		return this.#genesisBlock;
	}

	public setGenesisCommit(block: Contracts.Crypto.Commit): void {
		this.#genesisBlock = block;
	}

	public getLastBlock(): Contracts.Crypto.Block {
		Utils.assert.defined<Contracts.Crypto.Block>(this.#lastBlock);
		return this.#lastBlock;
	}

	public setLastBlock(block: Contracts.Crypto.Block): void {
		this.#lastBlock = block;
	}

	public getLastHeight(): number {
		return this.#height;
	}

	public setTotalRoundAndHeight(totalRound: number, height: number): void {
		this.#totalRound = totalRound;
		this.#height = height;
	}

	public getTotalRound(): number {
		return this.#totalRound;
	}


	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		this.setLastBlock(unit.getBlock());
		this.#height = unit.height;
		this.#totalRound += unit.round + 1;
	}
}
