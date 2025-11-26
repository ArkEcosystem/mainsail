import type { ISortByObjectSorter } from "fast-sort";
import { sort } from "fast-sort";

import type { Iteratee } from "./internal/index.js";
import { map } from "./map.js";

type SortDirection = "asc" | "desc";

const toSortDirection = (order: string | undefined): SortDirection => (order === "desc" ? "desc" : "asc");

export const orderBy = <T>(values: T[], iteratees: Iteratee<T> | Iteratee<T>[], orders: string | string[]): T[] => {
	const iterArray: Iteratee<T>[] = Array.isArray(iteratees) ? iteratees : [iteratees];

	const orderArray: string[] = Array.isArray(orders) ? orders : [orders];

	const criteria = map<Iteratee<T>, ISortByObjectSorter<T>>(iterArray, (iter, index) => {
		const direction = toSortDirection(orderArray[index]);

		if (direction === "desc") {
			return { desc: iter };
		}

		return { asc: iter };
	});

	return sort(values).by(criteria);
};
