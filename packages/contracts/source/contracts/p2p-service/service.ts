export interface Service {
	boot(): Promise<void>;
	dispose(): Promise<void>;
	getNetworkBlockNumberPercentile(p: number): number;
}
