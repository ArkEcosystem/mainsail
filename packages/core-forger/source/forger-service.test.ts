import { Container, Contracts, Enums, Services, Utils } from "@arkecosystem/core-kernel";
import { NetworkStateStatus } from "../../core-p2p/source";
import { Actions } from "@arkecosystem/core-state";
import { Crypto, Identities, Interfaces, Managers, Transactions } from "@arkecosystem/crypto";
import { describe, Sandbox } from "../../core-test-framework/source";

import { ForgerService } from "./forger-service";
import { ForgeNewBlockAction, IsForgingAllowedAction } from "./actions";
import { HostNoResponseError, RelayCommunicationError } from "./errors";
import sinon from "sinon";

import { calculateActiveDelegates } from "../test/calculate-active-delegates";

describe<{
	sandbox: Sandbox;
	forgerService: ForgerService;
	delegates;
	mockNetworkState;
	mockTransaction;
	transaction;
	mockRound;
	logger: any;
	client: any;
	handlerProvider: any;
}>("ForgerService", ({ assert, beforeEach, clock, it, spy, spyFn, stub, stubFn }) => {
	const mockHost = { hostname: "127.0.0.1", port: 4000 };

	beforeEach((context) => {
		context.logger = {
			error: spyFn(),
			debug: spyFn(),
			info: spyFn(),
			warning: spyFn(),
		};

		context.client = {
			register: spyFn(),
			dispose: spyFn(),
			broadcastBlock: spyFn(),
			syncWithNetwork: spyFn(),
			getRound: stubFn(),
			getNetworkState: stubFn(),
			getTransactions: stubFn(),
			emitEvent: spyFn(),
			selectHost: spyFn(),
		};

		context.handlerProvider = {
			isRegistrationRequired: stubFn(),
			registerHandlers: spyFn(),
		};

		context.sandbox = new Sandbox();
		context.sandbox.app.bind(Container.Identifiers.LogService).toConstantValue(context.logger);
		context.sandbox.app
			.bind(Container.Identifiers.TransactionHandlerProvider)
			.toConstantValue(context.handlerProvider);

		context.sandbox.app
			.bind(Container.Identifiers.TriggerService)
			.to(Services.Triggers.Triggers)
			.inSingletonScope();

		context.sandbox.app
			.get<Services.Triggers.Triggers>(Container.Identifiers.TriggerService)
			.bind("getActiveDelegates", new Actions.GetActiveDelegatesAction(context.sandbox.app));

		context.sandbox.app
			.get<Services.Triggers.Triggers>(Container.Identifiers.TriggerService)
			.bind("forgeNewBlock", new ForgeNewBlockAction());

		context.sandbox.app
			.get<Services.Triggers.Triggers>(Container.Identifiers.TriggerService)
			.bind("isForgingAllowed", new IsForgingAllowedAction());

		const getTimeStampForBlock = (height: number) => {
			switch (height) {
				case 1:
					return 0;
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		};

		stub(Utils.forgingInfoCalculator, "getBlockTimeLookup").returnValue(getTimeStampForBlock);

		context.forgerService = context.sandbox.app.resolve<ForgerService>(ForgerService);

		stub(context.sandbox.app, "resolve").returnValueOnce(context.client); // forger-service only resolves Client

		stub(Crypto.Slots, "getTimeInMsUntilNextSlot").returnValue(0);

		context.delegates = calculateActiveDelegates();

		context.mockNetworkState = {
			status: NetworkStateStatus.Default,
			getNodeHeight: () => 10,
			getLastBlockId: () => "11111111",
			getOverHeightBlockHeaders: () => [],
			getQuorum: () => 0.7,
			toJson: () => "test json",
		};

		const recipientAddress = Identities.Address.fromPassphrase("recipient's secret");
		context.transaction = Transactions.BuilderFactory.transfer()
			.version(1)
			.amount("100")
			.recipientId(recipientAddress)
			.sign("sender's secret")
			.build();

		context.mockTransaction = {
			transactions: [context.transaction.serialized.toString("hex")],
			poolSize: 10,
			count: 10,
		};

		context.mockRound = {
			timestamp: Crypto.Slots.getTime() - 5,
			reward: 0,
			lastBlock: { height: 100 },
		};
	});

	it("GetRound should return undefined", (context) => {
		context.forgerService.register({ hosts: [mockHost] });

		assert.undefined(context.forgerService.getRound());
	});

	it("GetRemainingSlotTime should return undefined", (context) => {
		context.forgerService.register({ hosts: [mockHost] });

		assert.undefined(context.forgerService.getRemainingSlotTime());
	});

	it("GetLastForgedBlock should return undefined", (context) => {
		context.forgerService.register({ hosts: [mockHost] });

		assert.undefined(context.forgerService.getLastForgedBlock());
	});

	it("Register should register an associated client", async (context) => {
		context.forgerService.register({ hosts: [mockHost] });

		context.client.register.calledWith([mockHost]);
	});

	it("Dispose should dispose of an associated client", async (context) => {
		context.forgerService.register({ hosts: [mockHost] });

		// @ts-ignore
		assert.false(context.forgerService.isStopped);

		context.forgerService.dispose();

		context.client.dispose.calledWith();

		// @ts-ignore
		assert.true(context.forgerService.isStopped);
	});

	it("Boot should register handlers, set delegates, and log active delegates info message", async (context) => {
		context.handlerProvider.isRegistrationRequired.returns(true);

		context.forgerService.register({ hosts: [mockHost] });
		context.client.getRound.returns({ delegates: context.delegates });

		clock(new Date());
		await assert.resolves(() => context.forgerService.boot(context.delegates));

		assert.equal((context.forgerService as any).delegates, context.delegates);

		const expectedInfoMessage = `Loaded ${Utils.pluralize(
			"active delegate",
			context.delegates.length,
			true,
		)}: ${context.delegates.map((wallet) => `${wallet.delegate.username} (${wallet.publicKey})`).join(", ")}`;

		context.handlerProvider.registerHandlers.calledWith();
		context.logger.info.calledWith(expectedInfoMessage);
	});

	it("Boot should skip logging when the service is already initialised", async (context) => {
		context.forgerService.register({ hosts: [mockHost] });
		context.client.getRound.returns({ delegates: context.delegates });
		(context.forgerService as any).initialized = true;

		clock(new Date());
		await assert.resolves(() => context.forgerService.boot(context.delegates));

		assert.true(context.logger.info.neverCalledWith(`Forger Manager started.`));
	});

	it("Boot should not log when there are no active delegates", async (context) => {
		context.forgerService.register({ hosts: [mockHost] });
		context.client.getRound.returns({ delegates: context.delegates });

		clock(new Date());
		await assert.resolves(() => context.forgerService.boot([]));

		assert.true(context.logger.info.calledOnceWith(`Forger Manager started.`));
	});

	it("Boot should log inactive delegates correctly", async (context) => {
		const numberActive = 10;

		const round = { data: { delegates: context.delegates.slice(0, numberActive) } };

		context.client.getRound.returns(round.data as Contracts.P2P.CurrentRound);

		const expectedInactiveDelegatesMessage = `Loaded ${Utils.pluralize(
			"inactive delegate",
			context.delegates.length - numberActive,
			true,
		)}: ${context.delegates
			.slice(numberActive)
			.map((delegate) => delegate.publicKey)
			.join(", ")}`;

		context.forgerService.register({ hosts: [mockHost] });

		clock(new Date());
		await assert.resolves(() => context.forgerService.boot(context.delegates));

		assert.true(context.logger.info.calledWith(expectedInactiveDelegatesMessage));
	});

	it("Boot should catch and log errors", async (context) => {
		context.client.getRound.rejects(() => new Error("oops"));
		context.forgerService.register({ hosts: [mockHost] });

		clock(new Date());
		await assert.resolves(() => context.forgerService.boot(context.delegates));

		assert.true(context.logger.warning.calledWith(`Waiting for a responsive host`));
	});

	it("Boot should set correct timeout to check slots", async (context) => {
		context.client.getRound.returns({
			delegates: context.delegates,
			timestamp: Crypto.Slots.getTime() - 7,
			lastBlock: { height: 100 },
		});

		context.forgerService.register({ hosts: [mockHost] });

		const fakeTimers = clock(new Date());
		const timeoutSpy = spy(fakeTimers, "setTimeout");

		await assert.resolves(() => context.forgerService.boot(context.delegates));

		timeoutSpy.calledWith(
			sinon.match.func,
			sinon.match((value) => 0 <= value && value < 2000),
		);
	});

	it("GetTransactionsForForging should log error when transactions are empty", async (context) => {
		context.forgerService.register({ hosts: [mockHost] });
		context.client.getTransactions.returns([]);

		await assert.resolves(() => context.forgerService.getTransactionsForForging());
		assert.equal(await context.forgerService.getTransactionsForForging(), []);

		assert.true(context.logger.error.calledWith(`Could not get unconfirmed transactions from transaction pool.`));
	});

	it("GetTransactionsForForging should log and return valid transactions", async (context) => {
		context.forgerService.register({ hosts: [mockHost] });

		const recipientAddress = Identities.Address.fromPassphrase("recipient's secret");
		const transaction = Transactions.BuilderFactory.transfer()
			.version(1)
			.amount("100")
			.recipientId(recipientAddress)
			.sign("sender's secret")
			.build();

		const mockTransaction = {
			transactions: [transaction.serialized.toString("hex")],
			poolSize: 10,
			count: 10,
		};

		context.client.getTransactions.returns(mockTransaction);

		await assert.resolves(() => context.forgerService.getTransactionsForForging());
		assert.equal(await context.forgerService.getTransactionsForForging(), [transaction.data]);

		assert.true(context.logger.error.notCalled);

		const expectedLogInfo =
			`Received ${Utils.pluralize("transaction", 1, true)} ` +
			`from the pool containing ${Utils.pluralize("transaction", mockTransaction.poolSize, true)} total`;
		assert.true(context.logger.debug.calledWith(expectedLogInfo));
	});

	it("isForgingAllowed should not allow forging when network status is unknown", async (context) => {
		assert.false(
			// @ts-ignore
			context.forgerService.isForgingAllowed({ status: NetworkStateStatus.Unknown }, context.delegates[0]),
		);
		assert.true(context.logger.info.calledWith("Failed to get network state from client. Will not forge."));
	});

	it("isForgingAllowed should not allow forging when network status is a cold start", async (context) => {
		assert.false(
			// @ts-ignore
			context.forgerService.isForgingAllowed({ status: NetworkStateStatus.ColdStart }, context.delegates[0]),
		);
		assert.true(context.logger.info.calledWith("Skipping slot because of cold start. Will not forge."));
	});

	it("isForgingAllowed should not allow forging when network status is below minimum peers", async (context) => {
		assert.false(
			context.forgerService.isForgingAllowed(
				// @ts-ignore
				{ status: NetworkStateStatus.BelowMinimumPeers },
				context.delegates[0],
			),
		);
		assert.true(context.logger.info.calledWith("Network reach is not sufficient to get quorum. Will not forge."));
	});

	it("isForgingAllowed should log double forge warning for any overheight block headers", async (context) => {
		context.client.getRound.returns({ delegates: context.delegates });
		context.forgerService.register({ hosts: [mockHost] });

		clock(new Date());
		await assert.resolves(() => context.forgerService.boot(context.delegates));

		const overHeightBlockHeaders: Array<{
			[id: string]: any;
		}> = [
			{
				generatorPublicKey: context.delegates[0].publicKey,
				id: 1,
			},
		];

		context.mockNetworkState.getQuorum = () => 0.99;
		context.mockNetworkState.getOverHeightBlockHeaders = () => overHeightBlockHeaders;

		assert.true(
			// @ts-ignore
			context.forgerService.isForgingAllowed(context.mockNetworkState, context.delegates[0]),
		);
		const expectedOverHeightInfo = `Detected ${Utils.pluralize(
			"distinct overheight block header",
			overHeightBlockHeaders.length,
			true,
		)}.`;
		assert.true(context.logger.info.calledWith(expectedOverHeightInfo));

		const expectedDoubleForgeWarning = `Possible double forging delegate: ${context.delegates[0].delegate.username} (${context.delegates[0].publicKey}) - Block: ${overHeightBlockHeaders[0].id}.`;

		assert.true(context.logger.warning.calledWith(expectedDoubleForgeWarning));
	});

	it("isForgingAllowed should not allow forging if quorum is not met", async (context) => {
		context.client.getRound.returns({
			delegates: context.delegates,
			timestamp: Crypto.Slots.getTime() - 7,
			lastBlock: { height: 100 },
		});

		context.forgerService.register({ hosts: [mockHost] });

		clock(new Date());
		await assert.resolves(() => context.forgerService.boot(context.delegates));

		(context.mockNetworkState.getQuorum = () => 0.6),
			assert.false(
				// @ts-ignore
				context.forgerService.isForgingAllowed(context.mockNetworkState, context.delegates[0]),
			);

		assert.true(context.logger.info.calledWith("Not enough quorum to forge next block. Will not forge."));
		assert.true(context.logger.debug.calledWith(`Network State: ${context.mockNetworkState.toJson()}`));
		assert.true(context.logger.warning.notCalled);
	});

	it("isForgingAllowed should allow forging if quorum is met", async (context) => {
		context.client.getRound.returns({
			delegates: context.delegates,
			timestamp: Crypto.Slots.getTime() - 7,
			lastBlock: { height: 100 },
		});

		context.forgerService.register({ hosts: [mockHost] });

		clock(new Date());
		await assert.resolves(() => context.forgerService.boot(context.delegates));

		assert.true(
			// @ts-ignore
			context.forgerService.isForgingAllowed(context.mockNetworkState, context.delegates[0]),
		);

		assert.true(context.logger.debug.notCalled);
		assert.true(context.logger.warning.notCalled);
	});

	it("isForgingAllowed should allow forging if quorum is met, not log warning if overheight delegate is not the same", async (context) => {
		context.client.getRound.returns({
			delegates: context.delegates,
			timestamp: Crypto.Slots.getTime() - 7,
			lastBlock: { height: 100 },
		});

		context.forgerService.register({ hosts: [mockHost] });

		clock(new Date());
		await assert.resolves(() => context.forgerService.boot(context.delegates));

		const overHeightBlockHeaders: Array<{
			[id: string]: any;
		}> = [
			{
				generatorPublicKey: context.delegates[0].publicKey,
				id: 1,
			},
		];

		context.mockNetworkState.getOverHeightBlockHeaders = () => overHeightBlockHeaders;

		assert.true(
			// @ts-ignore
			context.forgerService.isForgingAllowed(context.mockNetworkState, context.delegates[1]),
		);

		assert.true(context.logger.debug.notCalled);
		assert.true(context.logger.warning.notCalled);
	});

	it("checkSlot should do nothing when the forging service is stopped", async (context) => {
		context.forgerService.register({ hosts: [mockHost] });

		await context.forgerService.dispose();

		await assert.resolves(() => context.forgerService.checkSlot());

		assert.true(context.logger.info.notCalled);
		assert.true(context.logger.warning.notCalled);
		assert.true(context.logger.error.notCalled);
		assert.true(context.logger.debug.notCalled);
	});

	it("checkSlot should set timer if forging is not yet allowed", async (context) => {
		context.forgerService.register({ hosts: [mockHost] });
		(context.forgerService as any).initialized = true;

		context.client.getRound.returns({
			delegates: context.delegates,
			timestamp: Crypto.Slots.getTime() - 7,
			lastBlock: { height: 100 },
		});

		// expect(context.logger.info).not.toHaveBeenCalledWith();
		assert.false(context.logger.info.calledWith(`Forger Manager started.`));

		context.client.getRound.returns({
			delegates: context.delegates,
			timestamp: Crypto.Slots.getTime() - 7,
			lastBlock: { height: 100 },
		});

		const fakeTimers = clock(new Date());
		const timeoutSpy = spy(fakeTimers, "setTimeout");

		await assert.resolves(() => context.forgerService.boot(context.delegates));
		await assert.resolves(() => context.forgerService.checkSlot());

		timeoutSpy.calledWith(sinon.match.func, 200);
		assert.true(context.logger.info.notCalled);
		assert.true(context.logger.warning.notCalled);
		assert.true(context.logger.error.notCalled);
		assert.true(context.logger.debug.notCalled);
	});

	it("checkSlot should set timer and log nextForger which is active on node", async (context) => {
		Crypto.Slots.getTimeInMsUntilNextSlot.returns(0);

		const round = {
			data: {
				delegates: context.delegates,
				canForge: true,
				currentForger: {
					publicKey: context.delegates[context.delegates.length - 1].publicKey,
				},
				nextForger: { publicKey: context.delegates[context.delegates.length - 3].publicKey },
				timestamp: Crypto.Slots.getTime() - 7,
				lastBlock: { height: 100 },
			},
		};

		context.client.getRound.returns(round.data as Contracts.P2P.CurrentRound);

		context.forgerService.register({ hosts: [mockHost] });
		(context.forgerService as any).initialized = true;

		clock(new Date());
		await assert.resolves(() =>
			context.forgerService.boot(context.delegates.slice(0, context.delegates.length - 2)),
		);

		assert.true(context.logger.info.neverCalledWith(`Forger Manager started.`));

		context.client.getRound.returns(round.data as Contracts.P2P.CurrentRound);
		await assert.resolves(() => context.forgerService.checkSlot());

		assert.true(context.client.syncWithNetwork.calledOnce);

		const expectedInfoMessage = `Next forging delegate ${
			context.delegates[context.delegates.length - 3].delegate.username
		} (${context.delegates[context.delegates.length - 3].publicKey}) is active on this node.`;

		assert.true(context.logger.info.calledWith(expectedInfoMessage));
		assert.true(context.logger.warning.notCalled);
		assert.true(context.logger.error.notCalled);
	});

	it("checkSlot should set timer and not log message if nextForger is not active", async (context) => {
		Crypto.Slots.getTimeInMsUntilNextSlot.returns(0);

		const round = {
			data: {
				delegates: context.delegates,
				canForge: true,
				currentForger: {
					publicKey: context.delegates[context.delegates.length - 2].publicKey,
				},
				nextForger: { publicKey: context.delegates[context.delegates.length - 1].publicKey },
				timestamp: Crypto.Slots.getTime() - 7,
				lastBlock: { height: 100 },
			},
		};

		context.client.getRound.returns(round.data as Contracts.P2P.CurrentRound);

		context.forgerService.register({ hosts: [mockHost] });
		(context.forgerService as any).initialized = true;

		clock(new Date());
		await assert.resolves(() =>
			context.forgerService.boot(context.delegates.slice(0, context.delegates.length - 3)),
		);
		assert.false(context.logger.info.calledWith(`Forger Manager started.`));

		context.client.getRound.returns(round.data as Contracts.P2P.CurrentRound);
		await assert.resolves(() => context.forgerService.checkSlot());

		assert.true(context.client.syncWithNetwork.notCalled);

		const expectedInfoMessage = `Next forging delegate ${
			context.delegates[context.delegates.length - 3].delegate.username
		} (${context.delegates[context.delegates.length - 3].publicKey}) is active on this node.`;

		assert.false(context.logger.info.calledWith(expectedInfoMessage));
		assert.true(context.logger.warning.notCalled);
		assert.true(context.logger.error.notCalled);
		assert.false(context.logger.info.calledWith(`Sending wake-up check to relay node ${mockHost.hostname}`));
	});

	it("checkSlot should forge valid blocks when forging is allowed", async (context) => {
		Crypto.Slots.getTimeInMsUntilNextSlot.returns(0);

		const mockBlock = { data: {} } as Interfaces.IBlock;
		const nextDelegateToForge = {
			publicKey: context.delegates[2].publicKey,
			forge: stubFn().returns(mockBlock),
		};
		context.delegates[context.delegates.length - 2] = Object.assign(
			nextDelegateToForge,
			context.delegates[context.delegates.length - 2],
		);

		const round = {
			data: {
				delegates: context.delegates,
				canForge: true,
				currentForger: {
					publicKey: context.delegates[context.delegates.length - 2].publicKey,
				},
				nextForger: { publicKey: context.delegates[context.delegates.length - 3].publicKey },
				lastBlock: {
					height: 3,
				},
				timestamp: Crypto.Slots.getTime() - 7,
				reward: "0",
				current: 1,
			},
		};

		context.client.getRound.returns(round.data as Contracts.P2P.CurrentRound);

		context.forgerService.register({ hosts: [mockHost] });

		context.client.getTransactions.returns([]);

		const spyForgeNewBlock = spy(context.forgerService, "forgeNewBlock");

		context.client.getNetworkState.returns(context.mockNetworkState);

		const fakeTimers = clock(new Date());
		await assert.resolves(() => context.forgerService.boot(context.delegates));

		context.client.getRound.returns(round.data as Contracts.P2P.CurrentRound);

		await assert.resolves(() => context.forgerService.checkSlot());

		spyForgeNewBlock.calledWith(
			context.delegates[context.delegates.length - 2],
			round.data,
			context.mockNetworkState,
		);

		const loggerWarningMessage = `The NetworkState height (${context.mockNetworkState.getNodeHeight()}) and round height (${
			round.data.lastBlock.height
		}) are out of sync. This indicates delayed blocks on the network.`;
		assert.true(context.logger.warning.calledWith(loggerWarningMessage));
	});

	it("checkSlot should not log warning message when nodeHeight does not equal last block height", async (context) => {
		Crypto.Slots.getTimeInMsUntilNextSlot.returns(0);

		const mockBlock = { data: {} } as Interfaces.IBlock;
		const nextDelegateToForge = {
			publicKey: context.delegates[2].publicKey,
			forge: stubFn().returns(mockBlock),
		};
		context.delegates[context.delegates.length - 2] = Object.assign(
			nextDelegateToForge,
			context.delegates[context.delegates.length - 2],
		);

		const round = {
			data: {
				delegates: context.delegates,
				canForge: true,
				currentForger: {
					publicKey: context.delegates[context.delegates.length - 2].publicKey,
				},
				nextForger: { publicKey: context.delegates[context.delegates.length - 3].publicKey },
				lastBlock: {
					height: 10,
				},
				timestamp: Crypto.Slots.getTime() - 7,
				reward: "0",
			},
		};

		context.client.getRound.returns(round.data as Contracts.P2P.CurrentRound);

		context.forgerService.register({ hosts: [mockHost] });

		context.client.getTransactions.returns([]);

		const spyForgeNewBlock = spy(context.forgerService, "forgeNewBlock");

		context.client.getNetworkState.returns(context.mockNetworkState);

		const fakeTimers = clock(new Date());
		await assert.resolves(() => context.forgerService.boot(context.delegates));

		context.client.getRound.returns(round.data as Contracts.P2P.CurrentRound);

		await context.forgerService.checkSlot();

		spyForgeNewBlock.calledWith(
			context.delegates[context.delegates.length - 2],
			round.data,
			context.mockNetworkState,
		);

		const loggerWarningMessage = `The NetworkState height (${context.mockNetworkState.nodeHeight}) and round height (${round.data.lastBlock.height}) are out of sync. This indicates delayed blocks on the network.`;
		assert.false(context.logger.warning.calledWith(loggerWarningMessage));
	});

	it("checkSlot should not allow forging when blocked by network status", async (context) => {
		Crypto.Slots.getTimeInMsUntilNextSlot.returns(0);

		const mockBlock = { data: {} } as Interfaces.IBlock;
		const nextDelegateToForge = {
			publicKey: context.delegates[2].publicKey,
			forge: stubFn().returns(mockBlock),
		};
		context.delegates[context.delegates.length - 2] = Object.assign(
			nextDelegateToForge,
			context.delegates[context.delegates.length - 2],
		);

		const round = {
			data: {
				delegates: context.delegates,
				canForge: true,
				currentForger: {
					publicKey: context.delegates[context.delegates.length - 2].publicKey,
				},
				nextForger: { publicKey: context.delegates[context.delegates.length - 3].publicKey },
				lastBlock: {
					height: 10,
				},
				timestamp: 0,
				reward: "0",
			},
		};

		context.client.getRound.returns(round.data as Contracts.P2P.CurrentRound);

		context.forgerService.register({ hosts: [mockHost] });

		context.client.getTransactions.returns([]);

		const spyForgeNewBlock = stub(context.forgerService, "forgeNewBlock");

		context.mockNetworkState.status = NetworkStateStatus.Unknown;

		context.client.getNetworkState.returns(context.mockNetworkState);

		clock(new Date());
		await assert.resolves(() => context.forgerService.boot(context.delegates));

		context.client.getRound.returns(round.data as Contracts.P2P.CurrentRound);

		await assert.resolves(() => context.forgerService.checkSlot());

		spyForgeNewBlock.neverCalled();
	});

	it("checkSlot should catch network errors and set timeout to check slot later", async (context) => {
		Crypto.Slots.getTimeInMsUntilNextSlot.returns(0);

		const mockBlock = { data: {} } as Interfaces.IBlock;
		const nextDelegateToForge = {
			publicKey: context.delegates[2].publicKey,
			forge: stubFn().returns(mockBlock),
		};
		context.delegates[context.delegates.length - 2] = Object.assign(
			nextDelegateToForge,
			context.delegates[context.delegates.length - 2],
		);

		const round = {
			data: {
				delegates: context.delegates,
				canForge: true,
				currentForger: {
					publicKey: context.delegates[context.delegates.length - 2].publicKey,
				},
				nextForger: { publicKey: context.delegates[context.delegates.length - 3].publicKey },
				lastBlock: {
					height: 10,
				},
				timestamp: 0,
				reward: "0",
			},
		};

		context.client.getRound.returns(round.data as Contracts.P2P.CurrentRound);

		context.forgerService.register({ hosts: [mockHost] });

		context.client.getTransactions.returns([]);

		const spyForgeNewBlock = spy(context.forgerService, "forgeNewBlock");

		context.client.getNetworkState.rejects(new HostNoResponseError(`blockchain isn't ready`));

		const fakeTimers = clock(new Date());
		const timeoutSpy = spy(fakeTimers, "setTimeout");
		await assert.resolves(() => context.forgerService.boot(context.delegates));

		context.client.getRound.returns(round.data as Contracts.P2P.CurrentRound);

		await assert.resolves(() => context.forgerService.checkSlot());

		timeoutSpy.calledWith(sinon.match.func, 2000);
		spyForgeNewBlock.neverCalled();
		assert.true(context.logger.info.calledWith(`Waiting for relay to become ready.`));
	});

	it("checkSlot should log warning when error isn't a network error", async (context) => {
		Crypto.Slots.getTimeInMsUntilNextSlot.returns(0);

		const mockBlock = { data: {} } as Interfaces.IBlock;
		const nextDelegateToForge = {
			publicKey: context.delegates[2].publicKey,
			forge: stubFn().returns(mockBlock),
		};
		context.delegates[context.delegates.length - 2] = Object.assign(
			nextDelegateToForge,
			context.delegates[context.delegates.length - 2],
		);

		const round = {
			data: {
				delegates: context.delegates,
				canForge: true,
				currentForger: {
					publicKey: context.delegates[context.delegates.length - 2].publicKey,
				},
				nextForger: { publicKey: context.delegates[context.delegates.length - 3].publicKey },
				lastBlock: {
					height: 10,
				},
				timestamp: 0,
				reward: "0",
			},
		};

		context.client.getRound.returns(round.data as Contracts.P2P.CurrentRound);

		context.forgerService.register({ hosts: [mockHost] });

		context.client.getTransactions.returns([]);

		const spyForgeNewBlock = stub(context.forgerService, "forgeNewBlock");

		const mockEndpoint = `Test - Endpoint`;
		const mockError = `custom error`;
		context.client.getNetworkState.rejects(new RelayCommunicationError(mockEndpoint, mockError));

		const fakeTimers = clock(new Date());
		const timeoutSpy = spy(fakeTimers, "setTimeout");
		await assert.resolves(() => context.forgerService.boot(context.delegates));

		context.client.getRound.returns(round.data as Contracts.P2P.CurrentRound);

		await assert.resolves(() => context.forgerService.checkSlot());

		timeoutSpy.calledWith(sinon.match.func, 2000);
		spyForgeNewBlock.neverCalled();
		assert.true(context.logger.warning.calledWith(`Request to ${mockEndpoint} failed, because of '${mockError}'.`));
	});

	it("checkSlot should log error when error thrown during attempted forge isn't a network error", async (context) => {
		Crypto.Slots.getTimeInMsUntilNextSlot.returns(0);

		const mockBlock = { data: {} } as Interfaces.IBlock;
		const nextDelegateToForge = {
			publicKey: context.delegates[2].publicKey,
			forge: stubFn().returns(mockBlock),
		};
		context.delegates[context.delegates.length - 2] = Object.assign(
			nextDelegateToForge,
			context.delegates[context.delegates.length - 2],
		);

		const round = {
			data: {
				delegates: context.delegates,
				canForge: true,
				currentForger: {
					publicKey: context.delegates[context.delegates.length - 2].publicKey,
				},
				nextForger: { publicKey: context.delegates[context.delegates.length - 3].publicKey },
				lastBlock: {
					height: 10,
				},
				timestamp: 0,
				reward: "0",
				current: 9,
			},
		};

		context.client.getRound.returns(round.data as Contracts.P2P.CurrentRound);

		context.forgerService.register({ hosts: [mockHost] });

		context.client.getTransactions.returns([]);

		const spyForgeNewBlock = spy(context.forgerService, "forgeNewBlock");

		const mockError = `custom error`;
		context.client.getNetworkState.rejects(new Error(mockError));

		const fakeTimers = clock(new Date());
		const timeoutSpy = spy(fakeTimers, "setTimeout");

		await assert.resolves(() => context.forgerService.boot(context.delegates));

		context.client.getRound.returns(round.data as Contracts.P2P.CurrentRound);

		await assert.resolves(() => context.forgerService.checkSlot());

		timeoutSpy.calledWith(sinon.match.func, 2000);

		spyForgeNewBlock.neverCalled();
		assert.true(context.logger.error.calledOnce);
		assert.true(context.forgerService.client.emitEvent.calledWith(Enums.ForgerEvent.Failed, { error: mockError }));
		assert.true(
			context.logger.info.calledWith(
				`Round: ${round.data.current.toLocaleString()}, height: ${round.data.lastBlock.height.toLocaleString()}`,
			),
		);
	});

	it("checkSlot should not error when there is no round info", async (context) => {
		Crypto.Slots.getTimeInMsUntilNextSlot.returns(0);

		const mockBlock = { data: {} } as Interfaces.IBlock;
		const nextDelegateToForge = {
			publicKey: context.delegates[2].publicKey,
			forge: stubFn().returns(mockBlock),
		};
		context.delegates[context.delegates.length - 2] = Object.assign(
			nextDelegateToForge,
			context.delegates[context.delegates.length - 2],
		);

		const round = undefined;

		context.client.getRound.returns(round as Contracts.P2P.CurrentRound);

		context.forgerService.register({ hosts: [mockHost] });

		context.client.getTransactions.returns([]);

		const spyForgeNewBlock = spy(context.forgerService, "forgeNewBlock");

		const fakeTimers = clock(new Date());
		const timeoutSpy = spy(fakeTimers, "setTimeout");

		await assert.resolves(() => context.forgerService.boot(context.delegates));

		context.client.getRound.returns(round as Contracts.P2P.CurrentRound);

		await assert.resolves(() => context.forgerService.checkSlot());

		timeoutSpy.calledWith(sinon.match.func, 2000);
		spyForgeNewBlock.neverCalled();
		assert.true(context.logger.error.calledOnce);
		assert.true(
			context.forgerService.client.emitEvent.calledWith(Enums.ForgerEvent.Failed, {
				error: "Cannot read properties of undefined (reading 'delegates')",
			}),
		);
		assert.true(context.logger.info.notCalled);
	});

	it("ForgeNewBlock should fail to forge when delegate is already in next slot", async (context) => {
		context.client.getRound.returns({
			delegates: context.delegates,
			timestamp: Crypto.Slots.getTime() - 7,
			lastBlock: { height: 100 },
		});

		context.forgerService.register({ hosts: [mockHost] });

		context.client.getTransactions.returns(context.mockTransaction);

		clock(new Date());
		await assert.resolves(() => context.forgerService.boot(context.delegates));

		const address = `Delegate-Wallet-${2}`;

		const mockBlock = { data: {} } as Interfaces.IBlock;
		const mockPrevRound = { ...context.mockRound, timestamp: Crypto.Slots.getTime() - 9 };
		const nextDelegateToForge = {
			publicKey: context.delegates[2].publicKey,
			forge: stubFn().returns(mockBlock),
		};

		await assert.resolves(() =>
			// @ts-ignore
			context.forgerService.forgeNewBlock(nextDelegateToForge, mockPrevRound, context.mockNetworkState),
		);

		const prettyName = `Username: ${address} (${nextDelegateToForge.publicKey})`;

		const failedForgeMessage = `Failed to forge new block by delegate ${prettyName}, because already in next slot.`;

		assert.true(context.logger.warning.calledWith(failedForgeMessage));
	});

	it("ForgeNewBlock should fail to forge when there is not enough time left in slot", async (context) => {
		context.client.getRound.returns({
			delegates: context.delegates,
			timestamp: Crypto.Slots.getTime() - 7,
			lastBlock: { height: 100 },
		});

		context.forgerService.register({ hosts: [mockHost] });

		context.client.getTransactions.returns(context.mockTransaction);

		clock(new Date());
		await assert.resolves(() => context.forgerService.boot(context.delegates));

		const address = `Delegate-Wallet-${2}`;

		const mockBlock = { data: {} } as Interfaces.IBlock;
		const mockEndingRound = { ...context.mockRound, timestamp: Crypto.Slots.getTime() - 7 };
		const nextDelegateToForge = {
			publicKey: context.delegates[2].publicKey,
			forge: stubFn().returns(mockBlock),
		};

		stub(Crypto.Slots, "getSlotNumber").returnValue(0);

		await assert.resolves(() =>
			context.forgerService.forgeNewBlock(nextDelegateToForge as any, mockEndingRound, context.mockNetworkState),
		);

		const prettyName = `Username: ${address} (${nextDelegateToForge.publicKey})`;

		assert.true(
			context.logger.warning.calledWith(
				sinon.match((s) =>
					s.includes(`Failed to forge new block by delegate ${prettyName}, because there were`),
				),
			),
		);
	});

	it("ForgeNewBlock should forge valid new blocks", async (context) => {
		context.client.getRound.returns({ delegates: context.delegates });
		const timeLeftInMs = 3000;
		Crypto.Slots.getTimeInMsUntilNextSlot.returns(timeLeftInMs);

		context.forgerService.register({ hosts: [mockHost] });

		context.client.getTransactions.returns(context.mockTransaction);

		clock(new Date());
		await assert.resolves(() => context.forgerService.boot(context.delegates));

		const address = `Delegate-Wallet-${2}`;

		const mockBlock = { data: {} } as Interfaces.IBlock;
		const nextDelegateToForge = {
			publicKey: context.delegates[2].publicKey,
			forge: stubFn().returns(mockBlock),
		};

		stub(Crypto.Slots, "getSlotNumber").returnValue(0);

		await assert.resolves(
			// @ts-ignore
			() => context.forgerService.forgeNewBlock(nextDelegateToForge, context.mockRound, context.mockNetworkState),
		);

		const prettyName = `Username: ${address} (${nextDelegateToForge.publicKey})`;
		const infoForgeMessageOne = `Forged new block`;
		const infoForgeMessageTwo = ` by delegate ${prettyName}`;

		assert.true(context.logger.info.calledWith(sinon.match((s) => s.includes(infoForgeMessageOne))));
		assert.true(context.logger.info.calledWith(sinon.match((s) => s.includes(infoForgeMessageTwo))));
		assert.true(context.client.broadcastBlock.calledWith(mockBlock));
		assert.true(context.client.emitEvent.calledWith(Enums.BlockEvent.Forged, sinon.match.any));
		assert.true(context.client.emitEvent.calledWith(Enums.TransactionEvent.Forged, context.transaction.data));
	});

	it("ForgeNewBlock should forge valid new blocks when passed specific milestones", async (context) => {
		context.client.getRound.returns({
			delegates: context.delegates,
			timestamp: Crypto.Slots.getTime() - 3,
			lastBlock: { height: 100 },
		});

		const milestone = Managers.configManager.getMilestone(1);
		stub(Managers.configManager, "getMilestone").returnValue({
			...milestone,
			block: { version: 0, idFullSha256: true },
		});

		context.forgerService.register({ hosts: [mockHost] });

		context.client.getTransactions.returns(context.mockTransaction);

		context.mockNetworkState.lastBlockId = "c2fa2d400b4c823873d476f6e0c9e423cf925e9b48f1b5706c7e2771d4095538";

		clock(new Date());
		await assert.resolves(() => context.forgerService.boot(context.delegates));

		const address = `Delegate-Wallet-${2}`;

		const mockBlock = { data: {} } as Interfaces.IBlock;
		const nextDelegateToForge = {
			publicKey: context.delegates[2].publicKey,
			forge: stubFn().returns(mockBlock),
		};

		const mockRound = {
			data: {
				delegates: context.delegates,
				timestamp: Crypto.Slots.getTime() - 3,
				reward: 0,
				lastBlock: { height: 100 },
			},
			canForge: false,
		};

		stub(Crypto.Slots, "getSlotNumber").returnValue(0);
		await assert.resolves(() =>
			context.forgerService.forgeNewBlock(
				// @ts-ignore
				nextDelegateToForge,
				mockRound.data,
				context.mockNetworkState,
			),
		);

		const prettyName = `Username: ${address} (${nextDelegateToForge.publicKey})`;
		const infoForgeMessageOne = `Forged new block`;
		const infoForgeMessageTwo = ` by delegate ${prettyName}`;

		assert.true(context.logger.info.calledWith(sinon.match((s) => s.includes(infoForgeMessageOne))));
		assert.true(context.logger.info.calledWith(sinon.match((s) => s.includes(infoForgeMessageTwo))));
		assert.true(context.client.broadcastBlock.calledWith(mockBlock));
		assert.true(context.client.emitEvent.calledWith(Enums.BlockEvent.Forged, sinon.match.any));
		assert.true(context.client.emitEvent.calledWith(Enums.TransactionEvent.Forged, context.transaction.data));
	});
});
