import Boom from "@hapi/boom";
import { injectable } from "@mainsail/container";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { AbstractController } from "./controller";

class T {
	public transform(x: unknown) {
		return { transformed: x };
	}
}

@injectable()
class Controller extends AbstractController {
	public pagination(query: any) {
		return this.getQueryPagination(query);
	}

	public criteria(query: any, schemaObject: any) {
		return this.getQueryCriteria(query, schemaObject);
	}

	public listingPage(request: any) {
		return this.getListingPage(request);
	}

	public listingOrder(request: any) {
		return this.getListingOrder(request);
	}

	public respondResource(data: any, transformer: any) {
		return this.respondWithResource(data, transformer);
	}

	public respondCollection(data: any, transformer: any) {
		return this.respondWithCollection(data, transformer);
	}

	public resource(item: any, transformer: any) {
		return this.toResource(item, transformer);
	}

	public collection(items: any, transformer: any) {
		return this.toCollection(items, transformer);
	}

	public pagination2(resultsPage: any, transformer: any) {
		return this.toPagination(resultsPage, transformer);
	}

	public emptyPage() {
		return this.getEmptyPage();
	}
}

describe<{
	app: Application;
	subject: Controller;
}>("AbstractController", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.subject = context.app.resolve(Controller);
	});

	it("getQueryPagination - computes offset from page and limit", ({ subject }) => {
		assert.equal(subject.pagination({ limit: 10, page: 3 }), { limit: 10, offset: 20 });
	});

	it("getQueryPagination - page=1 falls back to offset 0", ({ subject }) => {
		assert.equal(subject.pagination({ limit: 10, page: 1 }), { limit: 10, offset: 0 });
	});

	it("getQueryPagination - honors an explicit offset over the page/limit computation", ({ subject }) => {
		assert.equal(subject.pagination({ limit: 25, offset: 50, page: 3 }), { limit: 25, offset: 50 });
	});

	it("getQueryPagination - respects an explicit offset of 0 (nullish, not falsy)", ({ subject }) => {
		assert.equal(subject.pagination({ limit: 25, offset: 0, page: 5 }), { limit: 25, offset: 0 });
	});

	it("getQueryCriteria - copies keys present in schemaObject and drops others", ({ subject }) => {
		const result = subject.criteria({ address: "abc", extra: "drop", height: 5 }, { address: {}, height: {} });

		assert.equal(result, { address: "abc", height: 5 });
	});

	it("getListingPage - default limit 100 when limit absent", ({ subject }) => {
		assert.equal(subject.listingPage({ query: {} }), { limit: 100, offset: 0 });
	});

	it("getListingPage - offset derived from page and limit", ({ subject }) => {
		assert.equal(subject.listingPage({ query: { limit: 10, page: 3 } }), { limit: 10, offset: 20 });
	});

	it("getListingPage - explicit offset override", ({ subject }) => {
		assert.equal(subject.listingPage({ query: { limit: 10, offset: 55, page: 3 } }), { limit: 10, offset: 55 });
	});

	it("getListingOrder - empty array when no orderBy", ({ subject }) => {
		assert.equal(subject.listingOrder({ query: {} }), []);
	});

	it("getListingOrder - string orderBy split by comma with asc default and desc direction", ({ subject }) => {
		assert.equal(subject.listingOrder({ query: { orderBy: "height:desc,fee" } }), [
			{ direction: "desc", property: "height" },
			{ direction: "asc", property: "fee" },
		]);
	});

	it("getListingOrder - array orderBy", ({ subject }) => {
		assert.equal(subject.listingOrder({ query: { orderBy: ["height:desc", "fee:asc"] } }), [
			{ direction: "desc", property: "height" },
			{ direction: "asc", property: "fee" },
		]);
	});

	it("respondWithResource - returns Boom.notFound when data is null", async ({ subject }) => {
		const result = await subject.respondResource(null, T);

		assert.true(Boom.isBoom(result));
		assert.is((result as Boom.Boom).output.statusCode, 404);
	});

	it("respondWithResource - returns { data } when data present", async ({ subject }) => {
		const result = await subject.respondResource({ id: 1 }, T);

		assert.equal(result, { data: { transformed: { id: 1 } } });
	});

	it("respondWithCollection - returns { data } collection", async ({ subject }) => {
		const result = await subject.respondCollection([{ id: 1 }, { id: 2 }], T);

		assert.equal(result, { data: [{ transformed: { id: 1 } }, { transformed: { id: 2 } }] });
	});

	it("toResource - transforms a single item", async ({ subject }) => {
		assert.equal(await subject.resource({ id: 1 }, T), { transformed: { id: 1 } });
	});

	it("toCollection - transforms each item", async ({ subject }) => {
		assert.equal(await subject.collection([{ id: 1 }, { id: 2 }], T), [
			{ transformed: { id: 1 } },
			{ transformed: { id: 2 } },
		]);
	});

	it("toPagination - spreads resultsPage and maps results", async ({ subject }) => {
		const resultsPage = {
			meta: { totalCountIsEstimate: false },
			results: [{ id: 1 }, { id: 2 }],
			totalCount: 2,
		};

		assert.equal(await subject.pagination2(resultsPage, T), {
			meta: { totalCountIsEstimate: false },
			results: [{ transformed: { id: 1 } }, { transformed: { id: 2 } }],
			totalCount: 2,
		});
	});

	it("getEmptyPage - returns the exact empty page object", ({ subject }) => {
		assert.equal(subject.emptyPage(), { meta: { totalCountIsEstimate: false }, results: [], totalCount: 0 });
	});
});
