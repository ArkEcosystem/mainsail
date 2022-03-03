import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";
import createTree from "functional-red-black-tree";

import { get } from "../../utils";

@injectable()
export class PaginationService {
	public getEmptyPage(): Contracts.Search.ResultsPage<any> {
		return { meta: { totalCountIsEstimate: false }, results: [], totalCount: 0 };
	}

	public getPage<T>(
		pagination: Contracts.Search.Pagination,
		sorting: Contracts.Search.Sorting,
		items: Iterable<T>,
	): Contracts.Search.ResultsPage<T> {
		const all = [...items];

		const results =
			sorting.length === 0
				? all.slice(pagination.offset, pagination.offset + pagination.limit)
				: this.getTop(sorting, pagination.offset + pagination.limit, all).slice(pagination.offset);

		return {
			meta: { totalCountIsEstimate: false },
			results,
			totalCount: all.length,
		};
	}

	public getTop<T>(sorting: Contracts.Search.Sorting, count: number, items: Iterable<T>): T[] {
		if (count < 0) {
			throw new RangeError(`Count should be greater or equal than zero.`);
		}

		if (count === 0) {
			return [];
		}

		let tree = createTree<T, undefined>((a, b) => this.compare(a, b, sorting));

		for (const item of items) {
			if (tree.length < count || this.compare(item, tree.end.key, sorting) === -1) {
				// @ts-ignore
				tree = tree.insert(item);
			}

			if (tree.length > count) {
				tree = tree.remove(tree.end.key);
			}
		}

		return tree.keys;
	}

	public compare<T>(a: T, b: T, sorting: Contracts.Search.Sorting): number {
		for (const { property, direction } of sorting) {
			let valueA = get(a, property);
			let valueB = get(b, property);

			// undefined and null are always at the end regardless of direction
			if (typeof valueA === "undefined" && typeof valueB === "undefined") {
				return 0;
			}
			if (typeof valueA === "undefined" && typeof valueB !== "undefined") {
				return 1;
			}
			if (typeof valueA !== "undefined" && typeof valueB === "undefined") {
				return -1;
			}
			if (valueA === null && valueB === null) {
				return 0;
			}
			if (valueA === null && valueB !== null) {
				return 1;
			}
			if (valueA !== null && valueB === null) {
				return -1;
			}

			if (direction === "desc") {
				[valueA, valueB] = [valueB, valueA];
			}

			if (
				(typeof valueA === "boolean" && typeof valueB === "boolean") ||
				(typeof valueA === "string" && typeof valueB === "string") ||
				(typeof valueA === "number" && typeof valueB === "number") ||
				(typeof valueA === "bigint" && typeof valueB === "bigint")
			) {
				if (valueA < valueB) {
					return -1;
				}
				if (valueA > valueB) {
					return 1;
				}
				continue;
			}

			if (valueA instanceof BigNumber && valueB instanceof BigNumber) {
				if (valueA.isLessThan(valueB)) {
					return -1;
				}
				if (valueA.isGreaterThan(valueB)) {
					return 1;
				}
				continue;
			}

			if (typeof valueA !== typeof valueB) {
				throw new TypeError(`Mismatched types '${typeof valueA}' and '${typeof valueB}' at '${property}'`);
			} else {
				throw new TypeError(`Unexpected type at '${property}'`);
			}
		}

		return 0;
	}
}
