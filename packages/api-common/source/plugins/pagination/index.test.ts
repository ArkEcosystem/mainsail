import { describe } from "@mainsail/test-runner";

import { pagination } from "./index.js";

const fakeH = () => ({ continue: Symbol("continue") });

const makeRoute = (plugins?: object) => ({
	route: { settings: plugins === undefined ? {} : { plugins } },
});


describe<{ server: any; extSpy: any }>("Index", ({ it, beforeEach, assert }) => {
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
		assert.is(extSpy[0][0], "onPreHandler");
		assert.is(extSpy[1][0], "onPostHandler");
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
