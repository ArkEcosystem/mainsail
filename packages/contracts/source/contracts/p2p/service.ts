export interface Service {
	boot(): Promise<void>;
	dispose(): Promise<void>;
	getNetworkBlockNumber(): number;
}
