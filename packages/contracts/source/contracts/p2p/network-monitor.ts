export interface NetworkMonitor {
	boot(): Promise<void>;
	getNetworkHeight(): number;
}
