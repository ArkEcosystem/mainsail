export interface Client {
	connect(options: any): Promise<any>;
	disconnect(): Promise<any>;
	request(options: any): Promise<any>;
}

export interface Socket {
	info: {
		"x-forwarded-for"?: string;
		remoteAddress: string;
	};
}

export type NesError = { isNes: true; type: string } & Error;
