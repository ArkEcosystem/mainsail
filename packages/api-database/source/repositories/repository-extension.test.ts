import { describe } from "@mainsail/test-runner";

import { makeExtendedRepository } from "./repository-extension";

// Minimal fake EntityMetadata: QueryHelper.getColumnName reads metadata.columns.
const makeMetadata = () => ({
	columns: [
		{ databaseName: "balance", isNullable: true, propertyName: "balance", type: "numeric" },
		{ databaseName: "address", isNullable: false, propertyName: "address", type: "citext" },
	],
});

// Chainable query-builder fake. Every mutating method records its call and returns `this`.
const makeQueryBuilder = (overrides: any = {}) => {
	const qb: any = {
		calls: [],
		record(name: string, args: any[]) {
			this.calls.push({ args, name });
			return this;
		},
		addOrderBy(...args: any[]) {
			return this.record("addOrderBy", args);
		},
		addSelect(...args: any[]) {
			return this.record("addSelect", args);
		},
		getMany: async () => overrides.getMany ?? [],
		getQueryAndParameters: () => overrides.getQueryAndParameters ?? ["SELECT * FROM wallets", { p1: 1 }],
		getRawOne: async () => overrides.getRawOne ?? { total_count: "0" },
		orderBy(...args: any[]) {
			return this.record("orderBy", args);
		},
		select(...args: any[]) {
			return this.record("select", args);
		},
		setQueryRunner(...args: any[]) {
			return this.record("setQueryRunner", args);
		},
		skip(...args: any[]) {
			return this.record("skip", args);
		},
		take(...args: any[]) {
			return this.record("take", args);
		},
		where(...args: any[]) {
			return this.record("where", args);
		},
		...overrides.methods,
	};
	return qb;
};

const makeDataSource = (base: any) => ({
	getRepository: () => base,
});

// base.extend merges the extension onto itself so `this` inside extension methods is base.
const makeBase = (fields: any = {}) => ({
	extend(object: any) {
		return Object.assign(this, object);
	},
	...fields,
});

describe<{
	metadata: any;
}>("repository-extension", ({ it, beforeEach, assert, stubFn }) => {
	// Build a fake queryRunner whose methods are Stubs; exposes callable object + handles.
	const makeQueryRunner = (queryStub?: any) => {
		const startTransaction = stubFn().resolvedValue(undefined);
		const commitTransaction = stubFn().resolvedValue(undefined);
		const rollbackTransaction = stubFn().resolvedValue(undefined);
		const release = stubFn().resolvedValue(undefined);
		const query = queryStub ?? stubFn().resolvedValue([]);
		const runner = {
			commitTransaction: commitTransaction.toFunction(),
			query: query.toFunction(),
			release: release.toFunction(),
			rollbackTransaction: rollbackTransaction.toFunction(),
			startTransaction: startTransaction.toFunction(),
		};
		return { commitTransaction, query, release, rollbackTransaction, runner, startTransaction };
	};

	beforeEach((context) => {
		context.metadata = makeMetadata();
	});

	it("addOrderBy: empty sorting is a no-op", ({ metadata }) => {
		const qb = makeQueryBuilder();
		const base = makeBase({ metadata });
		const repo = makeExtendedRepository({} as any, makeDataSource(base) as any, {});

		repo.addOrderBy(qb, []);

		assert.length(qb.calls, 0);
	});

	it("addOrderBy: single ascending non-nullable column, no NULLS LAST", ({ metadata }) => {
		const qb = makeQueryBuilder();
		const base = makeBase({ metadata });
		const repo = makeExtendedRepository({} as any, makeDataSource(base) as any, {});

		repo.addOrderBy(qb, [{ direction: "asc", property: "address" }]);

		assert.length(qb.calls, 1);
		assert.equal(qb.calls[0], { args: ["address", "ASC", undefined], name: "orderBy" });
	});

	it("addOrderBy: single descending nullable column adds NULLS LAST", ({ metadata }) => {
		const qb = makeQueryBuilder();
		const base = makeBase({ metadata });
		const repo = makeExtendedRepository({} as any, makeDataSource(base) as any, {});

		repo.addOrderBy(qb, [{ direction: "desc", property: "balance" }]);

		assert.equal(qb.calls[0], { args: ["balance", "DESC", "NULLS LAST"], name: "orderBy" });
	});

	it("addOrderBy: multiple sortings use orderBy then addOrderBy", ({ metadata }) => {
		const qb = makeQueryBuilder();
		const base = makeBase({ metadata });
		const repo = makeExtendedRepository({} as any, makeDataSource(base) as any, {});

		repo.addOrderBy(qb, [
			{ direction: "desc", property: "balance" },
			{ direction: "asc", property: "address" },
		]);

		assert.length(qb.calls, 2);
		assert.equal(qb.calls[0], { args: ["balance", "DESC", "NULLS LAST"], name: "orderBy" });
		assert.equal(qb.calls[1], { args: ["address", "ASC", undefined], name: "addOrderBy" });
	});

	it("addSkipOffset: applies skip(offset).take(limit)", ({ metadata }) => {
		const qb = makeQueryBuilder();
		const base = makeBase({ metadata });
		const repo = makeExtendedRepository({} as any, makeDataSource(base) as any, {});

		repo.addSkipOffset(qb, { limit: 25, offset: 100 });

		assert.equal(qb.calls[0], { args: [100], name: "skip" });
		assert.equal(qb.calls[1], { args: [25], name: "take" });
	});

	it("addWhere: calls where with QueryHelper-built sql and parameters", ({ metadata }) => {
		const qb = makeQueryBuilder();
		const base = makeBase({ metadata });
		const repo = makeExtendedRepository({} as any, makeDataSource(base) as any, {});

		repo.addWhere(qb, { op: "equal", property: "address", value: "0xabc" });

		assert.length(qb.calls, 1);
		assert.equal(qb.calls[0], { args: ["address = :p1", { p1: "0xabc" }], name: "where" });
	});

	it("makeExtendedRepository merges custom extend methods", ({ metadata }) => {
		const base = makeBase({ metadata });
		const repo = makeExtendedRepository({} as any, makeDataSource(base) as any, {
			customMethod() {
				return "custom-result";
			},
		});

		assert.equal((repo as any).customMethod(), "custom-result");
		assert.function(repo.addWhere);
	});

	// ---- listByExpression ----

	const makeListSetup = (options: any = {}) => {
		const metadata = makeMetadata();
		const resultsQb = makeQueryBuilder({
			getMany: options.results ?? [{ address: "0x1" }, { address: "0x2" }],
			getQueryAndParameters: options.getQueryAndParameters,
		});
		const countQb = makeQueryBuilder({ getRawOne: options.getRawOne });

		let createCount = 0;
		const qr = makeQueryRunner(options.explainStub);

		const base = makeBase({
			createQueryBuilder: () => (createCount++ === 0 ? resultsQb : countQb),
			manager: { connection: { createQueryRunner: () => qr.runner } },
			metadata,
		});

		const repo = makeExtendedRepository({} as any, makeDataSource(base) as any, {});
		return { countQb, qr, repo, resultsQb };
	};

	it("listByExpression: exact-count path (estimateTotalCount false)", async () => {
		const { repo, qr, countQb } = makeListSetup({ getRawOne: { total_count: "42" } });

		const page = await repo.listByExpression(
			{ op: "equal", property: "address", value: "0x1" },
			[],
			{ limit: 10, offset: 0 },
			{ estimateTotalCount: false },
		);

		assert.equal(page.totalCount, 42);
		assert.false(page.meta.totalCountIsEstimate);
		assert.length(page.results, 2);
		qr.commitTransaction.calledOnce();
		qr.release.calledOnce();
		// exact count uses a COUNT(*) select builder
		assert.equal(countQb.calls[1], { args: ["COUNT(*) AS total_count"], name: "select" });
	});

	it("listByExpression: EXPLAIN estimate path picks max(estimate, results.length)", async () => {
		const explainStub = stubFn().resolvedValue([
			{ "QUERY PLAN": "Seq Scan on wallets  (cost=... rows=1234 width=8)" },
		]);
		const { repo, qr } = makeListSetup({
			explainStub,
			getQueryAndParameters: ["SELECT * FROM wallets WHERE x", { p1: 1 }],
			results: [{ address: "0x1" }],
		});

		const page = await repo.listByExpression({ op: "true" }, [], { limit: 10, offset: 0 });

		assert.true(page.meta.totalCountIsEstimate);
		assert.is(page.totalCount, 1234);
		explainStub.calledOnce();
		assert.equal(explainStub.getCallArgs(0)[0], "EXPLAIN SELECT * FROM wallets WHERE x");
		qr.commitTransaction.calledOnce();
	});

	it("listByExpression: estimate path falls back to results.length when estimate is smaller", async () => {
		const explainStub = stubFn().resolvedValue([{ "QUERY PLAN": "rows=1" }]);
		const { repo } = makeListSetup({
			explainStub,
			results: [{ address: "0x1" }, { address: "0x2" }, { address: "0x3" }],
		});

		const page = await repo.listByExpression({ op: "true" }, [], { limit: 10, offset: 0 });

		assert.is(page.totalCount, 3);
	});

	it("listByExpression: options.selection resets select then addSelect per item", async () => {
		const { repo, resultsQb } = makeListSetup({
			explainStub: stubFn().resolvedValue([{ "QUERY PLAN": "rows=5" }]),
		});

		await repo.listByExpression(
			{ op: "true" },
			[],
			{ limit: 10, offset: 0 },
			{ selection: ["address", "balance"] },
		);

		const selectCall = resultsQb.calls.find((c: any) => c.name === "select");
		assert.equal(selectCall.args, [[]]);
		const addSelects = resultsQb.calls.filter((c: any) => c.name === "addSelect");
		assert.length(addSelects, 2);
		assert.equal(addSelects[0].args, ["address"]);
		assert.equal(addSelects[1].args, ["balance"]);
	});

	it("listByExpression: rolls back and rethrows on error, always releases", async () => {
		const metadata = makeMetadata();
		const resultsQb = makeQueryBuilder({
			methods: {
				getMany: async () => {
					throw new Error("boom");
				},
			},
		});
		const qr = makeQueryRunner();
		const base = makeBase({
			createQueryBuilder: () => resultsQb,
			manager: { connection: { createQueryRunner: () => qr.runner } },
			metadata,
		});
		const repo = makeExtendedRepository({} as any, makeDataSource(base) as any, {});

		await assert.rejects(() => repo.listByExpression({ op: "true" }, [], { limit: 10, offset: 0 }), "boom");

		qr.rollbackTransaction.calledOnce();
		qr.commitTransaction.neverCalled();
		qr.release.calledOnce();
	});
});
