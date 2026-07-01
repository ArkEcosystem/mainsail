// Based on https://github.com/fknop/hapi-pagination

import type Hapi from "@hapi/hapi";
import type { Utils } from "@mainsail/contracts";

import { applyToDefaults } from "@hapi/hoek";
import { assert, get } from "@mainsail/utils";
import Qs from "querystring";

import type { HapiRequest } from "../../types.js";

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
		const processResponse: boolean =
			this.isValidRoute(request) && statusCode >= 200 && statusCode <= 299;

		if (!processResponse) {
			return h.continue;
		}

		const { source } = request.response;
		assert.defined(source);

		const results = Array.isArray(source) ? source : source["results"];
		assert.array(results);

		// strip prefix in baseUri, we want a "clean" relative path
		const baseUri = request.url.pathname.slice(this.routePathPrefix.length) + "?";
		const { query, response } = request;
		const currentPage = query.page;
		const currentLimit = query.limit;

		let totalCount = 0;
		if (source["totalCount"]) {
			totalCount = source["totalCount"];
		} else if (request["totalCount"]) {
			totalCount = request["totalCount"];
		}

		let pageCount = 1;
		if (totalCount) {
			/* istanbul ignore next */
			pageCount = Math.trunc(totalCount / currentLimit) + (totalCount % currentLimit === 0 ? 0 : 1);
		}

		const getUri = (page: number | null): string | null =>
			/* istanbul ignore next */
			// tslint:disable-next-line: no-null-keyword
			page ? baseUri + Qs.stringify(applyToDefaults({ ...query, ...request.orig.query }, { page })) : null;

		const newSource = {
			meta: {
				...(source?.["meta"] ?? {}),

				count: results.length,

				first: getUri(1),

				last: getUri(pageCount),

				// tslint:disable-next-line: no-null-keyword
				/* istanbul ignore next */
				next: totalCount && currentPage < pageCount ? getUri(currentPage + 1) : null,
				pageCount: pageCount,

				previous:
					// tslint:disable-next-line: no-null-keyword
					totalCount && currentPage > 1 && currentPage <= pageCount + 1 ? getUri(currentPage - 1) : null,
				self: getUri(currentPage),
				totalCount: totalCount ? totalCount : 0,
			},
			// eslint-disable-next-line perfectionist/sort-objects
			data: results,
		};

		if (source["response"]) {
			const keys = Object.keys(source["response"]);

			for (const key of keys) {
				/* istanbul ignore next */
				if (key !== "meta" && key !== "data") {
					newSource[key] = source["response"][key];
				}
			}
		}

		(response as Utils.Mutable<Hapi.ResponseObject>).source = newSource;

		return h.continue;
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
}
