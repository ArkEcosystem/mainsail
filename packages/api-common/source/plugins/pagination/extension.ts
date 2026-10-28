// Based on https://github.com/fknop/hapi-pagination

import type Hapi from "@hapi/hapi";
import type { Utils } from "@mainsail/contracts";

import { assert, get } from "@mainsail/utils";
import Qs from "querystring";

import type { HapiRequest } from "../../types.js";

const flatten = (query: object, prefix = ""): Record<string, unknown> =>
	Object.fromEntries(
		Object.entries(query).flatMap(([key, value]) =>
			typeof value === "object" && value !== null && !Array.isArray(value)
				? Object.entries(flatten(value, `${prefix}${key}.`))
				: [[`${prefix}${key}`, value]],
		),
	);

export class Extension {
	private readonly routePathPrefix = "/api";
	public constructor(private readonly config: object) {}

	public isValidRoute(request: HapiRequest): boolean {
		const pagination = this.getRoutePaginationOptions(request);

		if (!pagination) {
			return false;
		}

		return pagination.enabled !== undefined ? pagination.enabled : true;
	}

	public onPreHandler(request: HapiRequest, h: Hapi.ResponseToolkit): Hapi.Lifecycle.ReturnValue {
		if (this.isValidRoute(request)) {
			const setParameter = (name, defaultValue) => {
				let value;

				if (request.query[name]) {
					value = Number.parseInt(request.query[name]);

					if (Number.isNaN(value)) {
						value = defaultValue;
					}
				}

				request.query[name] = value || defaultValue;
			};

			// ! should be set through validation schema
			setParameter("page", 1);
			setParameter("limit", get(this.config, "query.limit.default", 100));
		}

		return h.continue;
	}

	public onPostHandler(request: HapiRequest, h: Hapi.ResponseToolkit): Hapi.Lifecycle.ReturnValue {
		if ("isBoom" in request.response) {
			return h.continue;
		}

		const { statusCode } = request.response;
		const processResponse: boolean = this.isValidRoute(request) && statusCode >= 200 && statusCode <= 299;

		if (!processResponse) {
			return h.continue;
		}

		const { source } = request.response;
		assert.defined(source);

		const results = Array.isArray(source) ? source : source["results"];
		assert.array(results);

		const { query, response } = request;
		const currentLimit = query.limit;

		let totalCount = 0;
		if (source["totalCount"]) {
			totalCount = source["totalCount"];
		} else if (request["totalCount"]) {
			totalCount = request["totalCount"];
		}

		let pageCount = 1;
		if (totalCount) {
			pageCount = Math.trunc(totalCount / currentLimit) + (totalCount % currentLimit === 0 ? 0 : 1);
		}

		pageCount = this.getReachablePageCount(pageCount, currentLimit);

		const links = this.getLinks(request, pageCount, totalCount);

		const newSource = {
			meta: {
				...(source?.["meta"] ?? {}),

				count: results.length,

				first: links.first,

				last: links.last,

				next: links.next,
				pageCount: pageCount,

				previous: links.previous,
				self: links.self,
				totalCount: totalCount ? totalCount : 0,
			},
			// eslint-disable-next-line perfectionist/sort-objects
			data: results,
		};

		if (source["response"]) {
			const keys = Object.keys(source["response"]);

			for (const key of keys) {
				if (key !== "meta" && key !== "data") {
					newSource[key] = source["response"][key];
				}
			}
		}

		(response as Utils.Mutable<Hapi.ResponseObject>).source = newSource;

		return h.continue;
	}

	private getLinks(
		request: HapiRequest,
		pageCount: number,
		totalCount: number,
	): Record<"first" | "last" | "next" | "previous" | "self", string | null> {
		const { limit, offset, page } = request.query;

		// strip prefix in baseUri, we want a "clean" relative path
		const baseUri = request.url.pathname.slice(this.routePathPrefix.length) + "?";
		const query = flatten({ ...request.query, ...request.orig.query });
		const getUri = (position: { page: number } | { offset: number }): string =>
			baseUri + Qs.stringify({ ...query, ...position });

		if (offset === undefined) {
			return {
				first: getUri({ page: 1 }),
				last: getUri({ page: pageCount }),
				next: totalCount && page < pageCount ? getUri({ page: page + 1 }) : null,
				previous: totalCount && page > 1 && page <= pageCount + 1 ? getUri({ page: page - 1 }) : null,
				self: getUri({ page }),
			};
		}

		delete query.page;

		const maxDepth: number = get(this.config, "maxDepth") ?? Number.POSITIVE_INFINITY;

		return {
			first: getUri({ offset: 0 }),
			last: getUri({ offset: (pageCount - 1) * limit }),
			next:
				offset + limit < totalCount && offset + 2 * limit <= maxDepth
					? getUri({ offset: offset + limit })
					: null,
			previous: offset > 0 ? getUri({ offset: Math.max(0, offset - limit) }) : null,
			self: getUri({ offset }),
		};
	}

	private getRoutePaginationOptions(request: HapiRequest): { enabled: boolean } | undefined {
		const { plugins } = request.route.settings;
		if (!plugins) {
			return undefined;
		}

		if (!("pagination" in plugins)) {
			return undefined;
		}

		return plugins["pagination"] as { enabled: boolean };
	}

	private getReachablePageCount(pageCount: number, limit: number): number {
		const maxDepth: number | undefined = get(this.config, "maxDepth");

		return maxDepth === undefined ? pageCount : Math.min(pageCount, Math.max(1, Math.floor(maxDepth / limit)));
	}
}
