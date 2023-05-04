import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { SchemaObject } from "../schemas";
import { Options, Pagination, Resource, ResultsPage, Sorting } from "../types";

@injectable()
export class Controller {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "api")
	protected readonly apiConfiguration!: Providers.PluginConfiguration;

	protected getQueryPagination(query: Hapi.RequestQuery): Pagination {
		return {
			limit: query.limit,
			offset: (query.page - 1) * query.limit || 0,
		};
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

	protected getListingPage(request: Hapi.Request): Pagination {
		const pagination = {
			limit: request.query.limit || 100,
			offset: (request.query.page - 1) * request.query.limit || 0,
		};

		if (request.query.offset) {
			pagination.offset = request.query.offset;
		}

		return pagination;
	}

	protected getListingOrder(request: Hapi.Request): Sorting {
		if (!request.query.orderBy) {
			return [];
		}

		const orderBy = Array.isArray(request.query.orderBy) ? request.query.orderBy : request.query.orderBy.split(",");

		return orderBy.map((s: string) => ({
			direction: s.split(":")[1] === "desc" ? "desc" : "asc",
			property: s.split(":")[0],
		}));
	}

	protected getListingOptions(): Options {
		const estimateTotalCount = this.apiConfiguration.getOptional<boolean>("options.estimateTotalCount", true);

		return {
			estimateTotalCount,
		};
	}

	protected async respondWithResource(data, transformer, transform = true): Promise<any> {
		if (!data) {
			return Boom.notFound();
		}

		return { data: await this.toResource(data, transformer, transform) };
	}

	protected async respondWithCollection(data, transformer, transform = true): Promise<object> {
		return {
			data: await this.toCollection(data, transformer, transform),
		};
	}

	protected async toResource<T, R extends Resource>(
		item: T,
		transformer: new () => R,
		transform = true,
	): Promise<ReturnType<R["raw"]> | ReturnType<R["transform"]>> {
		const resource = this.app.resolve<R>(transformer);

		if (transform) {
			return resource.transform(item) as ReturnType<R["transform"]>;
		} else {
			return resource.raw(item) as ReturnType<R["raw"]>;
		}
	}

	protected async toCollection<T, R extends Resource>(
		items: T[],
		transformer: new () => R,
		transform = true,
	): Promise<ReturnType<R["raw"]>[] | ReturnType<R["transform"]>[]> {
		return Promise.all(items.map(async (item) => await this.toResource(item, transformer, transform)));
	}

	protected async toPagination<T, R extends Resource>(
		resultsPage: ResultsPage<T>,
		transformer: new () => R,
		transform = true,
	): Promise<ResultsPage<ReturnType<R["raw"]>> | ResultsPage<ReturnType<R["transform"]>>> {
		const items = await this.toCollection(resultsPage.results, transformer, transform);

		return { ...resultsPage, results: items };
	}
}
