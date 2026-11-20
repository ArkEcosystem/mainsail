import type { PeerProtocol } from "./enums.js";
import type { HeaderData } from "./header.js";

export interface PeerPlugins {
	[name: string]: { enabled: boolean; port: number; estimateTotalCount?: boolean };
}

export interface Peer {
	readonly port: number;
	readonly protocol: PeerProtocol;

	readonly ip: string;

	version: string | undefined;
	readonly latency: number | undefined;

	header: HeaderData;
	plugins: PeerPlugins;

	setLatency(latency: number): void;

	toBroadcast(): PeerBroadcast;
	toData(): PeerData;
}

// A peer as plain data, under the field names of the peer itself. The header is missing until the peer
// has answered or sent its first request.
export interface PeerData {
	ip: string;
	port: number;
	version: string | undefined;
	latency: number | undefined;
	plugins: PeerPlugins;
	header: HeaderData | undefined;
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
