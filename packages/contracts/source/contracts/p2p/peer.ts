import { Dayjs } from "dayjs";

import { Queue } from "../kernel/queue.js";
import { ApiNode } from "./api-node.js";
import { PeerProtocol } from "./enums.js";
import { HeaderData } from "./header.js";

export interface PeerPorts {
	[name: string]: number;
}

export interface PeerPlugins {
	[name: string]: { enabled: boolean; port: number; estimateTotalCount?: boolean };
}

export interface Peer {
	readonly url: string;
	readonly port: number;
	readonly protocol: PeerProtocol;

	readonly ip: string;
	readonly ports: PeerPorts;

	version: string | undefined;
	latency: number | undefined;

	header: HeaderData;
	plugins: PeerPlugins;
	lastPinged: Dayjs | undefined;
	sequentialErrorCounter: number;
	apiNodes: ApiNode[];

	recentlyPinged(): boolean;

	toBroadcast(): PeerBroadcast;

	getTransactionsQueue(): Promise<Queue>;
	dispose(): void;
}

export interface PeerBroadcast {
	ip: string;
	port: number;
	protocol: PeerProtocol;
}

export interface PeerState {
	height: number | undefined;
	header: Record<string, any>; // @@TODO rename, those are block headers but the name is horrible
}

export interface PeerData {
	ip: string;
	port: number;
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

export interface PeerPingResponse {
	state: PeerState;
	config: PeerConfig;
}

export interface PeerVerificationResult {
	readonly myHeight: number;
	readonly hisHeight: number;
	readonly highestCommonHeight: number;
}

export type PeerFactory = (ip: string) => Peer;
