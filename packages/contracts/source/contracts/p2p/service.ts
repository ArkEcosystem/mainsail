export interface Service {
	boot(): Promise<void>;
	dispose(): Promise<void>;
	getNetworkHeight(): number;
}
