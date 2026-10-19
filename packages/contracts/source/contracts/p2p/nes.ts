export interface Client {
	connect(options: Record<string, unknown>): Promise<void>;
	disconnect(): Promise<void>;
	request(options: Record<string, unknown>): Promise<void>;
}

export interface Socket {
	info: {
		remoteAddress: string;
	};
}

export type NesError = { isNes: true; type: string } & Error;
