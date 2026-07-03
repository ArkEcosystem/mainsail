import { describe } from "@mainsail/test-runner";

import { Extension } from "./extension.js";

const fakeH = () => ({ continue: Symbol("continue") });

const makeRoute = (plugins?: object) => ({
	route: { settings: plugins === undefined ? {} : { plugins } },
});

describe<{ subject: Extension }>("Extension", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.subject = new Extension({ query: { limit: { default: 100 } } });
	});

	// getRoutePaginationOptions / hasPagination / isValidRoute

	it("isValidRoute should be false when route has no plugins", ({ subject }) => {
		assert.false(subject.isValidRoute(makeRoute(undefined) as any));
	});

	it("isValidRoute should be false when plugins has no pagination", ({ subject }) => {
		assert.false(subject.isValidRoute(makeRoute({ other: {} }) as any));
	});

	it("isValidRoute should be false when pagination.enabled is false", ({ subject }) => {
		assert.false(subject.isValidRoute(makeRoute({ pagination: { enabled: false } }) as any));
	});

	it("isValidRoute should be true when pagination.enabled is true", ({ subject }) => {
		assert.true(subject.isValidRoute(makeRoute({ pagination: { enabled: true } }) as any));
	});

	it("isValidRoute should be true when pagination present with enabled undefined", ({ subject }) => {
		assert.true(subject.isValidRoute(makeRoute({ pagination: {} }) as any));
	});

	// onPreHandler

	it("onPreHandler should parse string page/limit into numbers", ({ subject }) => {
		const h = fakeH();
		const request: any = {
			...makeRoute({ pagination: { enabled: true } }),
			query: { limit: "10", page: "2" },
		};

		const result = subject.onPreHandler(request, h as any);

		assert.is(result, h.continue);
		assert.is(request.query.page, 2);
		assert.is(request.query.limit, 10);
	});

	it("onPreHandler should fall back to defaults for invalid page", ({ subject }) => {
		const h = fakeH();
		const request: any = {
			...makeRoute({ pagination: { enabled: true } }),
			query: { limit: "abc", page: "abc" },
		};

		subject.onPreHandler(request, h as any);

		assert.is(request.query.page, 1);
		assert.is(request.query.limit, 100);
	});

	it("onPreHandler should apply defaults when page/limit missing", ({ subject }) => {
		const h = fakeH();
		const request: any = {
			...makeRoute({ pagination: { enabled: true } }),
			query: {},
		};

		subject.onPreHandler(request, h as any);

		assert.is(request.query.page, 1);
		assert.is(request.query.limit, 100);
	});

	it("onPreHandler should not touch query for invalid route", ({ subject }) => {
		const h = fakeH();
		const request: any = {
			...makeRoute(undefined),
			query: { page: "2" },
		};

		const result = subject.onPreHandler(request, h as any);

		assert.is(result, h.continue);
		assert.is(request.query.page, "2");
		assert.undefined(request.query.limit);
	});

	// onPostHandler

	const makePostRequest = (source: any, overrides: any = {}) => ({
		orig: { query: {} },
		query: { limit: 10, page: 1 },
		response: {
			header: () => {},
			source,
			statusCode: 200,
		},
		url: new URL("http://x/api/blocks?page=1"),
		...makeRoute({ pagination: { enabled: true } }),
		...overrides,
	});

	it("onPostHandler should continue when response isBoom", ({ subject }) => {
		const h = fakeH();
		const request: any = {
			...makeRoute({ pagination: { enabled: true } }),
			response: { isBoom: true },
		};

		const result = subject.onPostHandler(request, h as any);

		assert.is(result, h.continue);
	});

	it("onPostHandler should continue for non-2xx statusCode", ({ subject }) => {
		const h = fakeH();
		const request: any = makePostRequest({ results: [], totalCount: 0 });
		request.response.statusCode = 404;

		const result = subject.onPostHandler(request, h as any);

		assert.is(result, h.continue);
		// source untouched
		assert.equal(request.response.source, { results: [], totalCount: 0 });
	});

	it("onPostHandler should continue for invalid route", ({ subject }) => {
		const h = fakeH();
		const request: any = makePostRequest({ results: [], totalCount: 0 }, makeRoute(undefined));

		const result = subject.onPostHandler(request, h as any);

		assert.is(result, h.continue);
		assert.equal(request.response.source, { results: [], totalCount: 0 });
	});

	it("onPostHandler should rewrite source with meta and data (happy path)", ({ subject }) => {
		const h = fakeH();
		const results = [{ id: 1 }, { id: 2 }];
		const request: any = makePostRequest({ results, totalCount: 25 });

		const result = subject.onPostHandler(request, h as any);

		assert.is(result, h.continue);

		const newSource = request.response.source;
		assert.equal(newSource.data, results);
		assert.is(newSource.meta.count, 2);
		assert.is(newSource.meta.totalCount, 25);
		// pageCount = trunc(25/10) + (25%10===0?0:1) = 2 + 1 = 3
		assert.is(newSource.meta.pageCount, 3);
		assert.equal(newSource.meta.self, "/blocks?limit=10&page=1");
		assert.equal(newSource.meta.first, "/blocks?limit=10&page=1");
		assert.equal(newSource.meta.last, "/blocks?limit=10&page=3");
		assert.equal(newSource.meta.next, "/blocks?limit=10&page=2");
		assert.equal(newSource.meta.previous, null);
	});

	it("onPostHandler should link the previous page and an exact page count on later pages", ({ subject }) => {
		const h = fakeH();
		const results = [{ id: 11 }, { id: 12 }];
		const request: any = makePostRequest({ results, totalCount: 20 });
		request.query.page = 2;

		subject.onPostHandler(request, h as any);

		const newSource = request.response.source;
		// pageCount = trunc(20/10) + (20%10===0?0:1) = 2 + 0 = 2
		assert.is(newSource.meta.pageCount, 2);
		assert.equal(newSource.meta.previous, "/blocks?limit=10&page=1");
		assert.equal(newSource.meta.self, "/blocks?limit=10&page=2");
		// The last page has no next page.
		assert.equal(newSource.meta.next, null);
	});

	it("onPostHandler should handle source as an array", ({ subject }) => {
		const h = fakeH();
		const results = [{ id: 1 }, { id: 2 }, { id: 3 }];
		const request: any = makePostRequest(results);

		subject.onPostHandler(request, h as any);

		const newSource = request.response.source;
		assert.equal(newSource.data, results);
		assert.is(newSource.meta.count, 3);
		// no totalCount -> 0
		assert.is(newSource.meta.totalCount, 0);
		assert.is(newSource.meta.pageCount, 1);
	});

	it("onPostHandler should use request.totalCount when source has none", ({ subject }) => {
		const h = fakeH();
		const results = [{ id: 1 }];
		const request: any = makePostRequest({ results });
		request.totalCount = 5;

		subject.onPostHandler(request, h as any);

		assert.is(request.response.source.meta.totalCount, 5);
	});

	it("onPostHandler should copy extra keys from source.response", ({ subject }) => {
		const h = fakeH();
		const results = [{ id: 1 }];
		const request: any = makePostRequest({
			response: { extraKey: "extraValue" },
			results,
			totalCount: 1,
		});

		subject.onPostHandler(request, h as any);

		const newSource = request.response.source;
		assert.is(newSource.extraKey, "extraValue");
		assert.equal(newSource.data, results);
	});

	it("onPostHandler should merge existing source.meta", ({ subject }) => {
		const h = fakeH();
		const results = [{ id: 1 }];
		const request: any = makePostRequest({
			meta: { existing: "meta-value" },
			results,
			totalCount: 1,
		});

		subject.onPostHandler(request, h as any);

		assert.is(request.response.source.meta.existing, "meta-value");
		assert.is(request.response.source.meta.count, 1);
	});
});
