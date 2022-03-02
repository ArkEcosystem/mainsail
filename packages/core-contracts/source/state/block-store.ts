import { IBlock, IBlockData } from "../crypto";

export interface BlockStore {
	get(key: string | number): IBlockData | undefined;

	set(value: IBlock): void;

	has(value: IBlockData): boolean;

	delete(value: IBlockData): void;

	clear(): void;

	resize(maxSize: number): void;

	last(): IBlock | undefined;

	values(): IBlockData[];

	count(): number;

	getIds(): string[];

	getHeights(): number[];
}
