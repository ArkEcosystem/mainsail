export interface Client {
	getHeight(): Promise<number>;
	getBlock(): Promise<Record<string, any>>;
}
