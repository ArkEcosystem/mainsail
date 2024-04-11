import { Dayjs } from "dayjs";

export interface ApiNode {
	readonly url: string;

	statusCode?: number;
	latency?: number;
	lastPinged?: Dayjs;

	// future proof
	height?: number;
	version?: string;
}

export interface ApiNodeBroadcast {
	url: string;
}
