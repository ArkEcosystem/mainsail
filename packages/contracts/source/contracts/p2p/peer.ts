import { Dayjs } from "dayjs";

import { Queue } from "../kernel";
import { IHeaderData } from "./header";

export interface PeerPorts {
	[name: string]: number;
}

export interface PeerPlugins {
	[name: string]: { enabled: boolean; port: number; estimateTotalCount?: boolean };
}

export interface Peer {
	readonly url: string;
	readonly port: number;

	readonly ip: string;
	readonly ports: PeerPorts;

	version: string | undefined;
	latency: number | undefined;

	state: IHeaderData;
	plugins: PeerPlugins;
	lastPinged: Dayjs | undefined;
	sequentialErrorCounter: number;

	recentlyPinged(): boolean;

	toBroadcast(): PeerBroadcast;

	getTransactionsQueue(): Promise<Queue>;
	dispose(): void;
}

export interface PeerBroadcast {
	ip: string;
	port: number;
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
