import { Events, Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { BlockProcessor } from "./block-processor";

describe<{
	app: Application;
	blockProcessor: BlockProcessor;
	events: any;
	state: any;
	unit: any;
}>("BlockProcessor", ({ beforeEach, it, assert, spy }) => {
	const blockHash = "ab".repeat(32);
	const voter = "0xBd6F65c58A46427AF4B257cBE231D0eD69eD5508";
	const validator = "0xEcC2717Ac3558141bFe0f512ACD5c62C5AB303C7";

	const blockData = { hash: blockHash, number: 3 };
	const contractEvents: Contracts.Evm.ContractEvent[] = [
		{ event: "Voted", txHash: `0x${"1".repeat(64)}`, txIndex: 0, validator, voter },
		{ addr: validator, event: "ValidatorResigned", txHash: `0x${"2".repeat(64)}`, txIndex: 1 },
	];

	beforeEach((context) => {
		const block = {
			gasUsed: 0,
			hash: blockHash,
			number: 3,
			round: 0,
			toData: () => blockData,
			transactions: [],
			transactionsCount: 0,
		};

		context.unit = {
			blockNumber: 3,
			getBlock: () => block,
			getCommit: async () => ({ block }),
			getContractEvents: () => contractEvents,
			round: 0,
		};

		context.events = { dispatch: async () => {} };
		context.state = { isBootstrap: () => false };

		const app = new Application();
		app.bind(Identifiers.State.Store).toConstantValue({ onCommit: async () => {} });
		app.bind(Identifiers.State.State).toConstantValue(context.state);
		app.bind(Identifiers.Cryptography.Configuration).toConstantValue({ getGenesisHeight: () => 0 });
		app.bind(Identifiers.BlockchainUtils.RoundCalculator).toConstantValue({ isNewRound: () => false });
		app.bind(Identifiers.Database.Service).toConstantValue({ onCommit: async () => {} });
		app.bind(Identifiers.Evm.Instance)
			.toConstantValue({ onCommit: async () => {} })
			.whenTagged("instance", "evm");
		app.bind(Identifiers.Processor.TransactionProcessor).toConstantValue({});
		app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		app.bind(Identifiers.Services.Log.Service).toConstantValue({ debug: () => {}, info: () => {} });
		app.bind(Identifiers.ValidatorSet.Service).toConstantValue({ onCommit: async () => {} });
		app.bind(Identifiers.Processor.BlockVerifier).toConstantValue({});
		app.bind(Identifiers.TransactionPool.Worker).toConstantValue({ onCommit: async () => {} });
		app.bind(Identifiers.Evm.Worker).toConstantValue({ onCommit: async () => {} });
		app.bind(Identifiers.BlockchainUtils.FeeCalculator).toConstantValue({});
		app.bind(Identifiers.Cryptography.Hash.Factory).toConstantValue({});

		context.app = app;
		context.blockProcessor = app.resolve(BlockProcessor);
	});

	it("#commit - should emit block.applied enriched with the unit's contract events", async ({
		blockProcessor,
		events,
		unit,
	}) => {
		const dispatch = spy(events, "dispatch");

		await blockProcessor.commit(unit);

		dispatch.calledWith(Events.BlockEvent.Applied, { ...blockData, contractEvents });
	});

	it("#commit - should not emit block.applied during bootstrap", async ({ blockProcessor, events, state, unit }) => {
		state.isBootstrap = () => true;
		const dispatch = spy(events, "dispatch");

		await blockProcessor.commit(unit);

		dispatch.neverCalled();
	});
});
