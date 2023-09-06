export interface Service {
	boot(): Promise<void>;
	getNetworkHeight(): number;
}
