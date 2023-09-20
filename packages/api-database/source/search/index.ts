export * as Criteria from "./criteria";
export * as Expressions from "./expressions";
export * as Filters from "./filters";

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

export * from "./query-helper";
export * from "./search";