import { Dayjs } from "dayjs";

import { Queue } from "../kernel";
import { HeaderData } from "./header";

export interface PeerPorts {
	[name: string]: number;
}

export interface PeerPlugins {
	[name: string]: { enabled: boolean; port: number; estimateTotalCount?: boolean };
}

export enum PeerProtocol {
	Http = 0,
	Https = 1,
}

export interface PeerApiNode {
	readonly ip: string;
	readonly port: number;
	readonly protocol: PeerProtocol;

	url(): string;

	statusCode?: number;
	latency?: number;
	lastPinged?: Dayjs;

	// future proof
	height?: number;
	version?: string;
}

export type PeerApiNodes = PeerApiNode[];

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
	apiNodes: PeerApiNodes;

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
