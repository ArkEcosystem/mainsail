import assert from "assert";
import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { Utils } from "@arkecosystem/core-kernel";

// todo: review its implementation and finally integrate it as planned in v2
@injectable()
export class BlockStore implements Contracts.State.BlockStore {
	private readonly byId: Utils.CappedMap<string, Contracts.Crypto.IBlockData>;
	private readonly byHeight: Utils.CappedMap<number, Contracts.Crypto.IBlockData>;
	private lastBlock: Contracts.Crypto.IBlock | undefined;

	public constructor(maxSize: number) {
		this.byId = new Utils.CappedMap<string, Contracts.Crypto.IBlockData>(maxSize);
		this.byHeight = new Utils.CappedMap<number, Contracts.Crypto.IBlockData>(maxSize);
	}

	public get(key: string | number): Contracts.Crypto.IBlockData | undefined {
		return typeof key === "string" ? this.byId.get(key) : this.byHeight.get(key);
	}

	public set(value: Contracts.Crypto.IBlock): void {
		const lastBlock: Contracts.Crypto.IBlock | undefined = this.last();

		if (value.data.height !== 1) {
			Utils.assert.defined<Contracts.Crypto.IBlock>(lastBlock);
		}

		assert.strictEqual(value.data.height, lastBlock ? lastBlock.data.height + 1 : 1);

		Utils.assert.defined<string>(value.data.id);

		this.byId.set(value.data.id, value.data);
		this.byHeight.set(value.data.height, value.data);
		this.lastBlock = value;
	}

	public has(value: Contracts.Crypto.IBlockData): boolean {
		Utils.assert.defined<string>(value.id);

		return this.byId.has(value.id) || this.byHeight.has(value.height);
	}

	public delete(value: Contracts.Crypto.IBlockData): void {
		Utils.assert.defined<string>(value.id);

		this.byId.delete(value.id);
		this.byHeight.delete(value.height);
	}

	public clear(): void {
		this.byId.clear();
		this.byHeight.clear();
	}

	public resize(maxSize: number): void {
		this.byId.resize(maxSize);
		this.byHeight.resize(maxSize);
	}

	public last(): Contracts.Crypto.IBlock | undefined {
		return this.lastBlock;
	}

	public values(): Contracts.Crypto.IBlockData[] {
		return this.byId.values();
	}

	public count(): number {
		return this.byId.count();
	}

	public getIds(): string[] {
		return this.byId.keys();
	}

	public getHeights(): number[] {
		return this.byHeight.keys();
	}
}
