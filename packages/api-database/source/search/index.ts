export * as Criteria from "./criteria.js";
export * as Expressions from "./expressions.js";
export * as Filters from "./filters/index.js";

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

export * from "./query-helper.js";
export * from "./search.js";
