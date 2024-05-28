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

	recentlyPinged(): boolean;
	toBroadcast(): PeerBroadcast;
}

export type PeerFactory = (ip: string) => Peer;

export interface PeerRepository {
	getPeers(): Peer[];
	getPeer(ip: string): Peer;
	setPeer(peer: Peer): void;
	forgetPeer(peer: Peer): void;
	hasPeer(ip: string): boolean;

	getPendingPeers(): Peer[];
	getPendingPeer(ip: string): Peer;
	setPendingPeer(peer: Peer): void;
	forgetPendingPeer(peer: Peer): void;
	hasPendingPeer(ip: string): boolean;
}

export interface PeerVerifier {
	verify(peer: Peer): Promise<boolean>;
}
export interface PeerProcessor {
	validateAndAcceptPeer(ip: string): Promise<void>;
}

export interface PeerCommunicator {
	postTransactions(peer: Peer, transactions: Transaction[]): Promise<void>;
}

export interface Broadcaster {
	broadcastTransactions(transactions: Transaction[]): Promise<void>;
}
