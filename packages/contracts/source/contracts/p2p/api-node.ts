import { Dayjs } from "dayjs";

import { PeerProtocol } from "./enums";

export interface ApiNode {
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
