import { Dayjs } from "dayjs";

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
