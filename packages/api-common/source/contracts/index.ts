import { Contracts } from "@mainsail/contracts";
import Hapi from "@hapi/hapi";

export type ApiServer = Hapi.Server<ServerState>;

export enum ServerType {
	Http = "HTTP",
	Https = "HTTPS",
}

export interface ServerState {
	app: Contracts.Kernel.Application,
	schemas: any;
}

export type Sorting = {
	property: string;
	direction: "asc" | "desc";
}[];

export type Pagination = {
	offset: number;
	limit: number;
};

export type Options = {
	estimateTotalCount?: boolean;
};

export type ResultsPage<T> = {
	results: T[];
	totalCount: number;
	meta: { totalCountIsEstimate: boolean };
};

export interface Resource {
	raw(resource): object;

	transform(resource): object;
}
