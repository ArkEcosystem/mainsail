import { NetworkState } from "./network-state";

export interface NetworkStatus {
	forked: boolean;
	blocksToRollback?: number;
}

export interface IRateLimitStatus {
	blocked: boolean;
	exceededLimitOnEndpoint: boolean;
}

export interface NetworkMonitor {
	boot(): Promise<void>;
	updateNetworkStatus(initialRun?: boolean): Promise<void>;
	cleansePeers({
		fast,
		forcePing,
		peerCount,
	}?: {
		fast?: boolean;
		forcePing?: boolean;
		peerCount?: number;
	}): Promise<void>;
	getNetworkHeight(): number;
	getNetworkState(): Promise<NetworkState>;
	refreshPeersAfterFork(): Promise<void>;
	checkNetworkHealth(): Promise<NetworkStatus>;
}
