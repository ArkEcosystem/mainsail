import type { PeerProtocol } from "./enums.js";
import type { HeaderData } from "./header.js";

export interface PeerPorts {
	[name: string]: number;
}

export interface PeerPlugins {
	[name: string]: { enabled: boolean; port: number; estimateTotalCount?: boolean };
}

export interface Peer {
	readonly port: number;
	readonly protocol: PeerProtocol;

	readonly ip: string;
	readonly ports: PeerPorts;

	version: string | undefined;
	readonly latency: number | undefined;

	header: HeaderData;
	plugins: PeerPlugins;

	setLatency(latency: number): void;

	toBroadcast(): PeerBroadcast;
}

export interface PeerBroadcast {
	ip: string;
	port: number;
	protocol: PeerProtocol;
}

export interface PeerState {
	blockNumber: number;
	blockHash: string;
}

export interface PeerConfig {
	version: string;
	network: {
		version: number;
		name: string;
		nethash: string;
		explorer: string;
		token: {
			name: string;
			symbol: string;
		};
	};
	plugins: PeerPlugins;
}

export type PeerFactory = (ip: string) => Peer;
