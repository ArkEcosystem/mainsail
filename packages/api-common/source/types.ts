import type Hapi from "@hapi/hapi";

export interface RequestQuery {
	// Restore previous type:
	// https://github.com/hapijs/hapi/blob/a4ab15060c093cba58a5c568d5b1b1b3e123c5e3/lib/types/request.d.ts#L253C5-L253C24
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}

export interface RequestParams {
	[key: string]: string;
}

export type HapiRequest = Hapi.Request<{ Params: RequestParams; Query: RequestQuery }>;
