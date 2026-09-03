import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Lock } from "@mainsail/utils";

import { Aggregator } from "./aggregator";
import { Bootstrapper } from "./bootstrapper";
import { CommitState } from "./commit-state";
import { Consensus } from "./consensus";
import { CommitProcessor, MessageProcessor, ProposalProcessor } from "./processors/index";
import { RoundStateRepository } from "./round-state-repository";
import { Scheduler } from "./scheduler";
import { ServiceProvider } from "./service-provider";

const identifiers = [
	Identifiers.Consensus.Aggregator,
	Identifiers.Consensus.RoundStateRepository,
	Identifiers.Consensus.Scheduler,
	Identifiers.Consensus.Processor.Proposal,
	Identifiers.Consensus.Processor.Message,
	Identifiers.Consensus.Processor.Commit,
	Identifiers.Consensus.CommitLock,
	Identifiers.Consensus.CommitState.Factory,
	Identifiers.Consensus.Bootstrapper,
	Identifiers.Consensus.Service,
];

const singletons: [symbol, new (...arguments_: any[]) => unknown][] = [
	[Identifiers.Consensus.Aggregator, Aggregator],
	[Identifiers.Consensus.RoundStateRepository, RoundStateRepository],
	[Identifiers.Consensus.Scheduler, Scheduler],
	[Identifiers.Consensus.Processor.Proposal, ProposalProcessor],
	[Identifiers.Consensus.Processor.Message, MessageProcessor],
	[Identifiers.Consensus.Processor.Commit, CommitProcessor],
	[Identifiers.Consensus.Bootstrapper, Bootstrapper],
	[Identifiers.Consensus.Service, Consensus],
];

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
	validatorSet: { getRoundValidators: () => Partial<Contracts.State.ValidatorWallet>[] };
}>("ServiceProvider", ({ it, beforeEach, assert, spy }) => {
	beforeEach((context) => {
		context.app = new Application();

		context.validatorSet = { getRoundValidators: () => [] };
		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(context.validatorSet);

		// Dependencies required only so the registered services can be resolved; never invoked here.
		context.app.bind(Identifiers.BlockchainUtils.ProposerCalculator).toConstantValue({});
		context.app.bind(Identifiers.BlockchainUtils.TimestampCalculator).toConstantValue({});
		context.app.bind(Identifiers.ConsensusStorage.Service).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Message.Serializer).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Proposal.Serializer).toConstantValue({});
		context.app
			.bind(Identifiers.Cryptography.Signature.Instance)
			.toConstantValue({})
			.whenTagged("type", "consensus");
		context.app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue({});
		context.app.bind(Identifiers.Forger.Block).toConstantValue({});
		context.app.bind(Identifiers.P2P.Broadcaster).toConstantValue({});
		context.app.bind(Identifiers.P2P.Statistic.Service).toConstantValue({});
		context.app.bind(Identifiers.Processor.BlockProcessor).toConstantValue({});
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({});
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({});
		context.app.bind(Identifiers.State.Store).toConstantValue({});
		context.app.bind(Identifiers.Validator.Repository).toConstantValue({});

		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("#register - should bind every consensus service", async ({ app, serviceProvider }) => {
		for (const identifier of identifiers) {
			assert.false(app.isBound(identifier));
		}

		await serviceProvider.register();

		for (const identifier of identifiers) {
			assert.true(app.isBound(identifier));
		}
	});

	it("#register - should bind the services as singletons", async ({ app, serviceProvider }) => {
		await serviceProvider.register();

		for (const [identifier, constructor] of singletons) {
			const instance = app.get(identifier);

			assert.instance(instance, constructor);
			assert.is(app.get(identifier), instance);
		}
	});

	it("#register - should bind a single shared commit lock", async ({ app, serviceProvider }) => {
		await serviceProvider.register();

		const commitLock = app.get(Identifiers.Consensus.CommitLock);

		assert.instance(commitLock, Lock);
		assert.is(app.get(Identifiers.Consensus.CommitLock), commitLock);
	});

	it("#register - should bind a factory that returns a commit state configured with the commit", async ({
		app,
		serviceProvider,
		validatorSet,
	}) => {
		await serviceProvider.register();

		validatorSet.getRoundValidators = () => [{ blsPublicKey: "bls-1" }, { blsPublicKey: "bls-2" }];

		const commit = { block: { number: 5 }, proof: { round: 2 } } as unknown as Contracts.Crypto.Commit;
		const factory = app.get<Contracts.Consensus.CommitStateFactory>(Identifiers.Consensus.CommitState.Factory);

		const commitState = factory(commit);

		assert.instance(commitState, CommitState);
		assert.equal(commitState.blockNumber, 5);
		assert.equal(commitState.round, 2);
		assert.equal(commitState.validators, ["bls-1", "bls-2"]);
		assert.is(commitState.getBlock(), commit.block);
	});

	it("#register - should create a new commit state on every factory call", async ({ app, serviceProvider }) => {
		await serviceProvider.register();

		const commit = { block: { number: 1 }, proof: { round: 0 } } as unknown as Contracts.Crypto.Commit;
		const factory = app.get<Contracts.Consensus.CommitStateFactory>(Identifiers.Consensus.CommitState.Factory);

		const first = factory(commit);
		const second = factory(commit);

		assert.instance(second, CommitState);
		assert.false(first === second);
	});

	it("#dispose - should dispose the consensus service", async () => {
		const app = new Application();
		const consensus = { dispose: async () => {} };
		app.bind(Identifiers.Consensus.Service).toConstantValue(consensus);

		const dispose = spy(consensus, "dispose");

		await app.resolve(ServiceProvider).dispose();

		dispose.calledOnce();
	});

	it("#dispose - should clear the scheduler of the registered consensus service", async ({
		app,
		serviceProvider,
	}) => {
		await serviceProvider.register();

		const clear = spy(app.get<Scheduler>(Identifiers.Consensus.Scheduler), "clear");

		await serviceProvider.dispose();

		clear.calledOnce();
	});
});
