// Based on https://github.com/fknop/hapi-pagination

import { applyToDefaults, assert } from "@hapi/hoek";
import { Utils } from "@mainsail/kernel";
import Qs from "querystring";

export class Extension {
	private readonly routePathPrefix = "/api";
	public constructor(private readonly config) {}

	public isValidRoute(request) {
		return this.hasPagination(request);
	}

	public onPreHandler(request, h) {
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

				return;
			};

			// ! should be set through validation schema
			setParameter("page", 1);
			setParameter("limit", Utils.get(this.config, "query.limit.default", 100));
		}

		return h.continue;
	}

	public onPostHandler(request, h) {
		const { statusCode } = request.response;
		const processResponse: boolean =
			this.isValidRoute(request) && statusCode >= 200 && statusCode <= 299 && this.hasPagination(request);

		if (!processResponse) {
			return h.continue;
		}

		const { source } = request.response;
		const results = Array.isArray(source) ? source : source.results;

		assert(Array.isArray(results), "The results must be an array");

		// strip prefix in baseUri, we want a "clean" relative path
		const baseUri = request.url.pathname.slice(this.routePathPrefix.length) + "?";
		const { query } = request;
		const currentPage = query.page;
		const currentLimit = query.limit;

		const { totalCount } = source.totalCount ? source : request;

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
				...source.meta,

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
			data: results,
		};

		if (source.response) {
			const keys = Object.keys(source.response);

			for (const key of keys) {
				/* istanbul ignore next */
				if (key !== "meta" && key !== "data") {
					newSource[key] = source.response[key];
				}
			}
		}

		request.response.source = newSource;

		return h.continue;
	}

	public hasPagination(request) {
		const pagination = this.getRoutePaginationOptions(request);

		if (!pagination) {
			return false;
		}

		return pagination.enabled !== undefined ? pagination.enabled : true;
	}

	private getRoutePaginationOptions(request) {
		return request.route.settings.plugins.pagination;
	}
}
