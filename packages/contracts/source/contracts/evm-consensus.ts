export interface Deployer {
	deploy(): Promise<void>;
}
