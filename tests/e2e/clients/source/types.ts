export interface Client {
	getHeight(): Promise<number>;
	getBlock(tagOrNumber: string | number): Promise<Record<string, any>>;
}
