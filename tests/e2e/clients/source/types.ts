export interface Client {
	getHeight(): Promise<number>;
}
