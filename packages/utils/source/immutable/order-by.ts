import { Iteratee } from "../internal/index.js";
import { orderBy as baseOrderBy } from "../order-by.js";

export const orderBy = <T>(values: T[], iteratees: Iteratee | Iteratee[], orders: string | string[]): T[] =>
	baseOrderBy([...values], iteratees, orders);
