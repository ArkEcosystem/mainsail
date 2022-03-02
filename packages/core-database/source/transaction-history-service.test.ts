import { Container } from "@arkecosystem/core-kernel";
import { Interfaces } from "@arkecosystem/crypto";
import { describe } from "../../core-test-framework";

import { TransactionHistoryService } from "./transaction-history-service";

const defaultTransactionSorting: Contracts.Search.Sorting = [
	{ property: "blockHeight", direction: "asc" },
	{ property: "sequence", direction: "asc" },
];

describe<{
	container: Container.Container;
	blockRepository: any;
	transactionRepository: any;
	blockFilter: any;
	transactionFilter: any;
	modelConverter: any;
}>("TransactionHistoryService", ({ assert, beforeEach, it, stub }) => {
	beforeEach((context) => {
		context.transactionRepository = {
			findManyByExpression: () => {},
			streamByExpression: () => {},
			listByExpression: () => {},
		};
		context.blockFilter = {
			getExpression: () => {},
		};
		context.transactionFilter = {
			getExpression: () => {},
		};
		context.modelConverter = {
			getTransactionData: () => {},
		};

		context.container = new Container.Container();
		context.container.bind(Identifiers.DatabaseBlockRepository).toConstantValue({});
		context.container
			.bind(Identifiers.DatabaseTransactionRepository)
			.toConstantValue(context.transactionRepository);
		context.container.bind(Identifiers.DatabaseBlockFilter).toConstantValue(context.blockFilter);
		context.container.bind(Identifiers.DatabaseTransactionFilter).toConstantValue(context.transactionFilter);
		context.container.bind(Identifiers.DatabaseModelConverter).toConstantValue(context.modelConverter);
	});

	it("findOneByCriteria should return undefined when model wasn't found in repository", async (context) => {
		const criteria: Contracts.Shared.OrTransactionCriteria = Symbol.for("criteria") as any;
		const expression: Contracts.Search.Expression<Contracts.Database.TransactionModel> = Symbol.for("expr") as any;

		stub(context.transactionFilter, "getExpression").resolvedValue(expression);
		stub(context.transactionRepository, "findManyByExpression").resolvedValue([]);
		stub(context.modelConverter, "getTransactionData").returnValueOnce([]);

		const blockHistoryService = context.container.resolve(TransactionHistoryService);
		const result = await blockHistoryService.findOneByCriteria(criteria);

		context.transactionFilter.getExpression.calledWith(criteria);
		context.transactionRepository.findManyByExpression.calledWith(expression, defaultTransactionSorting);
		context.modelConverter.getTransactionData.calledWith([]);
		assert.undefined(result);
	});

	it("findOneByCriteria should return block data when model was found in repository", async (context) => {
		const criteria: Contracts.Shared.OrTransactionCriteria = Symbol.for("criteria") as any;
		const expression: Contracts.Search.Expression<Contracts.Database.TransactionModel> = Symbol.for("expr") as any;
		const model: Contracts.Database.TransactionModel = Symbol.for("model") as any;
		const data: Crypto.ITransactionData = Symbol.for("data") as any;

		stub(context.transactionFilter, "getExpression").resolvedValue(expression);
		stub(context.transactionRepository, "findManyByExpression").resolvedValue([model]);
		stub(context.modelConverter, "getTransactionData").returnValueOnce([data]);

		const blockHistoryService = context.container.resolve(TransactionHistoryService);
		const result = await blockHistoryService.findOneByCriteria(criteria);

		context.transactionFilter.getExpression.calledWith(criteria);
		context.transactionRepository.findManyByExpression.calledWith(expression, defaultTransactionSorting);
		context.modelConverter.getTransactionData.calledWith([model]);

		assert.is(result, data);
	});

	it("findManyByCriteria should return array of block data", async (context) => {
		const criteria: Contracts.Shared.OrTransactionCriteria = Symbol.for("criteria") as any;
		const expression: Contracts.Search.Expression<Contracts.Database.TransactionModel> = Symbol.for("expr") as any;
		const model1: Contracts.Database.TransactionModel = Symbol.for("model") as any;
		const model2: Contracts.Database.TransactionModel = Symbol.for("model") as any;
		const data1: Crypto.ITransactionData = Symbol.for("data") as any;
		const data2: Crypto.ITransactionData = Symbol.for("data") as any;

		stub(context.transactionFilter, "getExpression").resolvedValue(expression);
		stub(context.transactionRepository, "findManyByExpression").resolvedValue([model1, model2]);
		stub(context.modelConverter, "getTransactionData").returnValueOnce([data1, data2]);

		const transactionHistoryService = context.container.resolve(TransactionHistoryService);
		const result = await transactionHistoryService.findManyByCriteria(criteria);

		context.transactionFilter.getExpression.calledWith(criteria);
		context.transactionRepository.findManyByExpression.calledWith(expression, defaultTransactionSorting);
		context.modelConverter.getTransactionData.calledWith([model1, model2]);

		assert.length(result, 2);
		assert.is(result[0], data1);
		assert.is(result[1], data2);
	});

	it("streamByCriteria should yield array of block data", async (context) => {
		const criteria: Contracts.Shared.OrTransactionCriteria = Symbol.for("criteria") as any;
		const expression: Contracts.Search.Expression<Contracts.Database.TransactionModel> = Symbol.for("expr") as any;
		const model1: Contracts.Database.TransactionModel = Symbol.for("model") as any;
		const model2: Contracts.Database.TransactionModel = Symbol.for("model") as any;
		const data1: Crypto.ITransactionData = Symbol.for("data") as any;
		const data2: Crypto.ITransactionData = Symbol.for("data") as any;

		stub(context.transactionFilter, "getExpression").resolvedValue(expression);
		stub(context.transactionRepository, "streamByExpression").callsFake(async function* () {
			yield model1;
			yield model2;
		});
		stub(context.modelConverter, "getTransactionData").returnValue([data1]).returnValue([data2]);

		const transactionHistoryService = context.container.resolve(TransactionHistoryService);
		const result: Crypto.ITransactionData[] = [];
		for await (const data of transactionHistoryService.streamByCriteria(criteria)) {
			result.push(data);
		}

		context.transactionFilter.getExpression.calledWith(criteria);
		context.transactionRepository.streamByExpression.calledWith(expression, defaultTransactionSorting);
		context.modelConverter.getTransactionData.calledWith([model1]);
		context.modelConverter.getTransactionData.calledWith([model2]);

		assert.length(result, 2);
		assert.is(result[0], data1);
		assert.is(result[1], data2);
	});

	it("listByCriteria should return search result", async (context) => {
		const criteria: Contracts.Shared.OrTransactionCriteria = Symbol.for("criteria") as any;
		const expression: Contracts.Search.Expression<Contracts.Database.TransactionModel> = Symbol.for("expr") as any;
		const model1: Contracts.Database.TransactionModel = Symbol.for("model") as any;
		const model2: Contracts.Database.TransactionModel = Symbol.for("model") as any;
		const data1: Crypto.ITransactionData = Symbol.for("data") as any;
		const data2: Crypto.ITransactionData = Symbol.for("data") as any;
		const sorting: Contracts.Search.Sorting = Symbol.for("order") as any;
		const pagination: Contracts.Search.Pagination = Symbol.for("page") as any;

		stub(context.transactionFilter, "getExpression").resolvedValue(expression);
		stub(context.transactionRepository, "listByExpression").resolvedValue({
			results: [model1, model2],
			totalCount: 2,
			meta: { totalCountIsEstimate: false },
		});
		stub(context.modelConverter, "getTransactionData").returnValueOnce([data1, data2]);

		const blockHistoryService = context.container.resolve(TransactionHistoryService);
		const result = await blockHistoryService.listByCriteria(criteria, sorting, pagination);

		context.transactionFilter.getExpression.calledWith(criteria);
		context.transactionRepository.listByExpression.calledWith(expression, sorting, pagination, undefined);
		context.modelConverter.getTransactionData.calledWith([model1, model2]);
		assert.equal(result, {
			results: [data1, data2],
			totalCount: 2,
			meta: { totalCountIsEstimate: false },
		});
	});
});
