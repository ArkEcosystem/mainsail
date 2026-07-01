import { describe } from "@mainsail/test-runner";

import { getConfig } from "./config";
import { Extension } from "./extension";
import { pagination } from "./index";

const fakeH = () => ({ continue: Symbol("continue") });

const makeRoute = (plugins?: object) => ({
	route: { settings: plugins === undefined ? {} : { plugins } },
});

describe("pagination/config getConfig", ({ it, assert }) => {
	it("should return config with default limit applied for valid options", () => {
		const { config, error } = getConfig({ query: { limit: { default: 100 } } });

		assert.undefined(error);
		assert.equal(config, { query: { limit: { default: 100 } } });
	});

	it("should apply default limit when not provided", () => {
		const { config, error } = getConfig({ query: { limit: {} } });

		assert.undefined(error);
		assert.equal(config, { query: { limit: { default: 100 } } });
	});

	it("should return an error for invalid options", () => {
		const { config, error } = getConfig({ query: { limit: { default: -5 } } });

		assert.undefined(config);
		assert.defined(error);
	});

	it("should return an error for non-integer default", () => {
		const { config, error } = getConfig({ query: { limit: { default: "abc" } } });

		assert.undefined(config);
		assert.defined(error);
	});
});

describe<{ subject: Extension }>("pagination/extension Extension", ({ it, beforeEach, assert }) => {
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

	it("hasPagination should reflect enabled flag", ({ subject }) => {
		assert.true(subject.hasPagination(makeRoute({ pagination: { enabled: true } }) as any));
		assert.false(subject.hasPagination(makeRoute({ pagination: { enabled: false } }) as any));
		assert.false(subject.hasPagination(makeRoute(undefined) as any));
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
		assert.defined(newSource.meta.self);
		assert.defined(newSource.meta.first);
		assert.defined(newSource.meta.last);
		assert.startsWith(newSource.meta.self, "/blocks?");
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

describe<{ server: any; extSpy: any }>("pagination/index register", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		const calls: any[] = [];
		context.extSpy = calls;
		context.server = {
			app: {},
			ext: (...args: any[]) => calls.push(args),
		};
	});

	it("should register onPreHandler and onPostHandler extensions for valid options", ({ server, extSpy }) => {
		pagination.register(server, { query: { limit: { default: 100 } } });

		assert.is(extSpy.length, 2);
		assert.is(extSpy[0][0], "onPreHandler");
		assert.is(extSpy[1][0], "onPostHandler");
	});

	it("should register with empty options (defaults applied)", ({ server, extSpy }) => {
		pagination.register(server, {});

		assert.is(extSpy.length, 2);
	});

	it("should throw the joi error for invalid options", ({ server }) => {
		assert.throws(() => pagination.register(server, { query: { limit: { default: -1 } } }));
	});

	it("registered onPreHandler should delegate to the extension", ({ server, extSpy }) => {
		pagination.register(server, { query: { limit: { default: 100 } } });

		const h = fakeH();
		const request: any = {
			...makeRoute({ pagination: { enabled: true } }),
			query: {},
		};

		const preHandler = extSpy[0][1];
		const result = preHandler(request, h);

		assert.is(result, h.continue);
		assert.is(request.query.page, 1);
		assert.is(request.query.limit, 100);
	});

	it("registered onPostHandler should delegate to the extension", ({ server, extSpy }) => {
		pagination.register(server, { query: { limit: { default: 100 } } });

		const h = fakeH();
		const request: any = {
			response: { isBoom: true },
			...makeRoute({ pagination: { enabled: true } }),
		};

		const postHandler = extSpy[1][1];
		const result = postHandler(request, h);

		assert.is(result, h.continue);
	});

	it("should have expected plugin metadata", () => {
		assert.is(pagination.name, "hapi-pagination");
		assert.is(pagination.version, "1.0.0");
	});
});
