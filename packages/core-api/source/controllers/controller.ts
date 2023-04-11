import {Providers } from "@arkecosystem/core-kernel";
import {  Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { inject, injectable, tagged } from "@arkecosystem/core-container";
import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";

import { Resource } from "../interfaces";
import { SchemaObject } from "../schemas";

@injectable()
export class Controller {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "core-api")
	protected readonly apiConfiguration!: Providers.PluginConfiguration;

	protected getQueryPagination(query: Hapi.RequestQuery): any { // Contracts.Search.Pagination
		const pagination = {
			limit: query.limit,
			offset: (query.page - 1) * query.limit || 0,
		};

		if (query.offset) {
			pagination.offset = query.offset;
		}

		return pagination;
	}

	protected getQueryCriteria(query: Hapi.RequestQuery, schemaObject: SchemaObject): unknown {
		const schemaObjectKeys = Object.keys(schemaObject);
		const criteria = {};
		for (const [key, value] of Object.entries(query)) {
			if (schemaObjectKeys.includes(key)) {
				criteria[key] = value;
			}
		}
		return criteria;
	}

	protected getListingPage(request: Hapi.Request): any { // Contracts.Search.Pagination
		const pagination = {
			limit: request.query.limit || 100,
			offset: (request.query.page - 1) * request.query.limit || 0,
		};

		if (request.query.offset) {
			pagination.offset = request.query.offset;
		}

		return pagination;
	}

	protected getListingOrder(request: Hapi.Request): any { // Contracts.Search.Sorting 
		if (!request.query.orderBy) {
			return [];
		}

		const orderBy = Array.isArray(request.query.orderBy) ? request.query.orderBy : request.query.orderBy.split(",");

		return orderBy.map((s: string) => ({
			direction: s.split(":")[1] === "desc" ? "desc" : "asc",
			property: s.split(":")[0],
		}));
	}

	protected getListingOptions(): any { // Contracts.Search.Options
		const estimateTotalCount = this.apiConfiguration.getOptional<boolean>("options.estimateTotalCount", true);

		return {
			estimateTotalCount,
		};
	}

	protected respondWithResource(data, transformer, transform = true): any {
		if (!data) {
			return Boom.notFound();
		}

		return { data: this.toResource(data, transformer, transform) };
	}

	protected respondWithCollection(data, transformer, transform = true): object {
		return {
			data: this.toCollection(data, transformer, transform),
		};
	}

	protected toResource<T, R extends Resource>(
		item: T,
		transformer: new () => R,
		transform = true,
	): ReturnType<R["raw"]> | ReturnType<R["transform"]> {
		const resource = this.app.resolve<R>(transformer);

		if (transform) {
			return resource.transform(item) as ReturnType<R["transform"]>;
		} else {
			return resource.raw(item) as ReturnType<R["raw"]>;
		}
	}

	protected toCollection<T, R extends Resource>(
		items: T[],
		transformer: new () => R,
		transform = true,
	): ReturnType<R["raw"]>[] | ReturnType<R["transform"]>[] {
		return items.map((item) => this.toResource(item, transformer, transform));
	}

	protected toPagination<T, R extends Resource>(
		resultsPage: any, // Contracts.Search.ResultsPage<T>
		transformer: new () => R,
		transform = true,
	): any { // Contracts.Search.ResultsPage<ReturnType<R["raw"]>> | Contracts.Search.ResultsPage<ReturnType<R["transform"]>>
		const items = this.toCollection(resultsPage.results, transformer, transform);

		return { ...resultsPage, results: items };
	}
}
