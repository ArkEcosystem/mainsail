import { Dayjs } from "dayjs";

import { Transaction } from "../crypto/index.js";

export enum PeerProtocol {
	Http = 0,
	Https = 1,
}

export interface PeerBroadcast {
	ip: string;
	port: number;
	protocol: PeerProtocol;
}

export interface Peer {
	readonly url: string;
	readonly port: number;
	readonly protocol: PeerProtocol;

	readonly ip: string;

	version: string | undefined;
	latency: number | undefined;

	lastPinged: Dayjs | undefined;
	errorCount: number;

	recentlyPinged(): boolean;
	toBroadcast(): PeerBroadcast;
}

export type PeerFactory = (ip: string) => Peer;

export interface PeerRepository {
	getPeers(): Peer[];
	getPeer(ip: string): Peer;
	setPeer(ip: string): void;
	forgetPeer(ip: string): void;
	hasPeer(ip: string): boolean;
}

export interface PeerCommunicator {
	postTransactions(peer: Peer, transactions: Transaction[]): Promise<void>;
}

export interface Broadcaster {
	broadcastTransactions(transactions: Transaction[]): Promise<void>;
}
