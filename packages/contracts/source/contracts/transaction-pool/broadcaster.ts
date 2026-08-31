import type { Enums } from "@mainsail/constants";
import type { Dayjs } from "dayjs";

import type { Transaction } from "../crypto/index.js";

export type PeerProtocol = Enums.Api.Protocol;

export interface Peer {
	readonly url: string;
	readonly port: number;
	readonly protocol: PeerProtocol;

	readonly ip: string;

	lastPinged: Dayjs | undefined;
	errorCount: number;
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
