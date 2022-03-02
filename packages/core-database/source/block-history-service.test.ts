import { Container } from "@arkecosystem/core-kernel";
import { describe } from "../../core-test-framework";

import { BlockHistoryService } from "./block-history-service";

const defaultBlockSorting: Contracts.Search.Sorting = [{ property: "height", direction: "asc" }];
describe<{
	container: Container.Container;
	blockRepository: any;
	transactionRepository: any;
	blockFilter: any;
	transactionFilter: any;
	modelConverter: any;
}>("BlockHistoryService", ({ assert, beforeEach, it, stub }) => {
	beforeEach((context) => {
		context.blockRepository = {
			findManyByExpression: () => undefined,
			listByExpression: () => undefined,
		};

		context.transactionRepository = {
			findManyByExpression: () => undefined,
			listByExpression: () => undefined,
		};

		context.blockFilter = {
			getExpression: () => undefined,
		};

		context.transactionFilter = {
			getExpression: () => undefined,
		};

		context.modelConverter = {
			getBlockData: () => undefined,
		};

		context.container = new Container.Container();
		context.container.bind(Identifiers.DatabaseBlockRepository).toConstantValue(context.blockRepository);
		context.container
			.bind(Identifiers.DatabaseTransactionRepository)
			.toConstantValue(context.transactionRepository);
		context.container.bind(Identifiers.DatabaseBlockFilter).toConstantValue(context.blockFilter);
		context.container.bind(Identifiers.DatabaseTransactionFilter).toConstantValue(context.transactionFilter);
		context.container.bind(Identifiers.DatabaseModelConverter).toConstantValue(context.modelConverter);
	});

	it("findOneByCriteria should return undefined when model wasn't found in repository", async (context) => {
		const criteria = {},
			expression = {};

		stub(context.blockFilter, "getExpression").returnValueOnce(expression);
		stub(context.blockRepository, "findManyByExpression").returnValueOnce([]);
		stub(context.modelConverter, "getBlockData").returnValueOnce([]);

		const blockHistoryService = context.container.resolve(BlockHistoryService);
		const result = await blockHistoryService.findOneByCriteria(criteria);

		context.blockFilter.getExpression.calledWith(criteria);
		context.blockRepository.findManyByExpression.calledWith(expression, defaultBlockSorting);
		context.modelConverter.getBlockData.calledWith([]);
		assert.undefined(result);
	});

	it("findOneByCriteria should return block data when model was found in repository", async (context) => {
		const criteria = {};
		const expression = {};
		const model = {};
		const data = {};

		stub(context.blockFilter, "getExpression").returnValueOnce(expression);
		stub(context.blockRepository, "findManyByExpression").returnValueOnce([model]);
		stub(context.modelConverter, "getBlockData").returnValueOnce([data]);

		const blockHistoryService = context.container.resolve(BlockHistoryService);
		const result = await blockHistoryService.findOneByCriteria(criteria);

		context.blockFilter.getExpression.calledWith(criteria);
		context.blockRepository.findManyByExpression.calledWith(expression, defaultBlockSorting);
		context.modelConverter.getBlockData.calledWith([model]);
		assert.is(result, data);
	});

	it("findManyByCriteria should return array of block data", async (context) => {
		const criteria = {},
			expression = {},
			model1 = {},
			model2 = {},
			data1 = {},
			data2 = {};

		stub(context.blockFilter, "getExpression").returnValueOnce(expression);
		stub(context.blockRepository, "findManyByExpression").returnValueOnce([model1, model2]);
		stub(context.modelConverter, "getBlockData").returnValueOnce([data1, data2]);

		const blockHistoryService = context.container.resolve(BlockHistoryService);
		const result = await blockHistoryService.findManyByCriteria(criteria);

		context.blockFilter.getExpression.calledWith(criteria);
		context.blockRepository.findManyByExpression.calledWith(expression, defaultBlockSorting);
		context.modelConverter.getBlockData.calledWith([model1, model2]);

		assert.is(result.length, 2);
		assert.is(result[0], data1);
		assert.is(result[1], data2);
	});

	it("listByCriteria should return search result", async (context) => {
		const criteria = {},
			expression = {},
			model1 = {},
			model2 = {},
			data1 = {},
			data2 = {},
			order = [],
			page = { offset: 0, limit: 100 };

		stub(context.blockFilter, "getExpression").returnValueOnce(expression);
		stub(context.blockRepository, "listByExpression").returnValueOnce({
			results: [model1, model2],
			totalCount: 2,
			meta: { totalCountIsEstimate: false },
		});
		stub(context.modelConverter, "getBlockData").returnValueOnce([data1, data2]);

		const blockHistoryService = context.container.resolve(BlockHistoryService);
		const result = await blockHistoryService.listByCriteria(criteria, order, page);

		context.blockFilter.getExpression.calledWith(criteria);
		context.blockRepository.listByExpression.calledWith(expression, order, page, undefined);
		context.modelConverter.getBlockData.calledWith([model1, model2]);
		assert.equal(result, {
			results: [data1, data2],
			totalCount: 2,
			meta: { totalCountIsEstimate: false },
		});
	});
});
