import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ServiceProvider } from "./service-provider.js";
import {
	ChainedVerifier,
	GasLimitVerifier,
	GeneratorVerifier,
	LegacyAttributeVerifier,
	RandaoVerifier,
	RewardVerifier,
	RoundVerifier,
	SizeVerifier,
	TimestampVerifier,
	TransactionDuplicatesVerifier,
	TransactionLengthVerifier,
	TransactionsRootVerifier,
	VersionVerifier,
} from "./verifiers/index.js";

type Context = {
	app: Application;
	serviceProvider: ServiceProvider;
	runVerifiers: () => Promise<string[]>;
};

const handlers = [
	ChainedVerifier,
	RoundVerifier,
	SizeVerifier,
	TimestampVerifier,
	GeneratorVerifier,
	VersionVerifier,
	RewardVerifier,
	TransactionLengthVerifier,
	TransactionDuplicatesVerifier,
	TransactionsRootVerifier,
	GasLimitVerifier,
	LegacyAttributeVerifier,
	RandaoVerifier,
];

describe<Context>("ServiceProvider", ({ assert, it, beforeEach, stub }) => {
	beforeEach((context) => {
		context.app = new Application();

		// The verifiers are resolved, never executed, so their dependencies only have to be bound.
		for (const identifier of [
			Identifiers.BlockchainUtils.ProposerCalculator,
			Identifiers.BlockchainUtils.TimestampCalculator,
			Identifiers.Cryptography.Block.HeaderSize,
			Identifiers.Cryptography.Configuration,
			Identifiers.Cryptography.Hash.Factory,
			Identifiers.Cryptography.Transaction.Verifier,
			Identifiers.State.Store,
			Identifiers.ValidatorSet.Service,
		]) {
			context.app.bind(identifier).toConstantValue({});
		}

		context.app.bind(Identifiers.Evm.Instance).toConstantValue({}).whenTagged("instance", "evm");
		context.app
			.bind(Identifiers.Cryptography.Signature.Instance)
			.toConstantValue({})
			.whenTagged("type", "consensus");

		context.serviceProvider = context.app.resolve(ServiceProvider);

		// Records which handler ran when the registered BlockVerifier verifies a unit.
		context.runVerifiers = async () => {
			const executed: string[] = [];

			for (const handler of handlers) {
				stub(handler.prototype, "execute").callsFake(async () => {
					executed.push(handler.name);
				});
			}

			await context.app
				.get<Contracts.Processor.Verifier>(Identifiers.Processor.BlockVerifier)
				.verify({} as Contracts.Processor.ProcessableUnit);

			return executed;
		};
	});

	it("should register the processor services", async ({ app, serviceProvider }) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.Processor.BlockVerifier));
		assert.true(app.isBound(Identifiers.Processor.BlockVerifierHandlers));
		assert.true(app.isBound(Identifiers.Processor.BlockProcessor));
		assert.true(app.isBound(Identifiers.Processor.TransactionProcessor));
	});

	it("should run the block verifiers in the registered order", async ({ serviceProvider, runVerifiers }) => {
		await serviceProvider.register();

		assert.equal(
			await runVerifiers(),
			handlers.map((handler) => handler.name),
		);
	});

	it("should verify the generator before the randao reveal", async ({ serviceProvider, runVerifiers }) => {
		// RandaoVerifier looks the proposer up by address and expects GeneratorVerifier to have confirmed it. In the
		// other order an unknown proposer fails with a generic lookup error instead of InvalidGenerator.
		await serviceProvider.register();

		const executed = await runVerifiers();

		assert.true(executed.indexOf(GeneratorVerifier.name) < executed.indexOf(RandaoVerifier.name));
	});
});
