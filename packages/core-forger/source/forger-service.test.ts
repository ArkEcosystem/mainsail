import { Identifiers } from "@arkecosystem/core-contracts";
import { Enums, Utils as AppUtils } from "@arkecosystem/core-kernel";

import { describe, Sandbox } from "../../core-test-framework/source";
import { ForgerService } from "./forger-service";
import { Utils } from "./utils";

describe<{
	sandbox: Sandbox;
	forgerService: ForgerService;
	blockchain: any;
	eventDispatcher: any;
	logger: any;
	networkMonitor: any;
	configuration: any;
	triggers: any;
}>("ForgerService", ({ assert, beforeEach, it, spy, stub, match }) => {
	const mockHost = { hostname: "127.0.0.1", port: 4000 };

	beforeEach((context) => {
		context.logger = {
			debug: () => {},
			error: () => {},
			info: () => {},
			warning: () => {},
		};

		context.eventDispatcher = {
			dispatch: () => {},
		};

		context.blockchain = {
			forceWakeup: () => {},
		};

		context.networkMonitor = {
			getNetworkState: () => {},
		};

		context.triggers = {
			call: () => {},
		};

		context.sandbox = new Sandbox();
		context.sandbox.app.bind(Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.sandbox.app.bind(Identifiers.EventDispatcherService).toConstantValue(context.eventDispatcher);
		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(context.logger);
		context.sandbox.app.bind(Identifiers.PeerNetworkMonitor).toConstantValue(context.networkMonitor);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.sandbox.app.bind(Identifiers.TriggerService).toConstantValue(context.triggers);

		context.forgerService = context.sandbox.app.resolve<ForgerService>(ForgerService);
	});

	it("#getRound - should return undefined", ({ forgerService }) => {
		assert.undefined(forgerService.getRound());
	});

	it("#boot - loud current round and rebind Usernames", async (context) => {
		const spyInfo = stub(context.logger, "info");
		const spyDispatch = stub(context.eventDispatcher, "dispatch");
		stub(context.triggers, "call").resolvedValue({
			validators: [{ publicKey: "publicKey1", validator: { username: "username1" } }],
		});

		assert.false(context.sandbox.app.isBound(Identifiers.Forger.Usernames));

		await context.forgerService.boot([]);
		await context.forgerService.dispose();

		assert.equal(context.sandbox.app.get(Identifiers.Forger.Usernames), { ["publicKey1"]: "username1" });
		spyDispatch.calledWith(Enums.ForgerEvent.Started, { activeValidators: [] });
		spyInfo.calledWith("Forger Manager started.");
	});

	it("#boot - loud current round, rebind Usernames and print active validator", async (context) => {
		const spyInfo = stub(context.logger, "info");
		const spyDispatch = stub(context.eventDispatcher, "dispatch");
		stub(context.triggers, "call").resolvedValue({
			validators: [{ publicKey: "publicKey1", validator: { username: "username1" } }],
		});

		assert.false(context.sandbox.app.isBound(Identifiers.Forger.Usernames));

		// @ts-ignore
		await context.forgerService.boot([{ publicKey: "publicKey1" }]);
		await context.forgerService.dispose();

		assert.equal(context.sandbox.app.get(Identifiers.Forger.Usernames), { ["publicKey1"]: "username1" });
		spyDispatch.calledWith(Enums.ForgerEvent.Started, { activeValidators: ["publicKey1"] });
		spyInfo.calledWith("Loaded validator username1 (publicKey1)");
		spyInfo.calledWith("Loaded 1 validator.");
		spyInfo.calledWith("Forger Manager started.");
	});

	it("#boot - loud current round, rebind Usernames and print inactive validator", async (context) => {
		const spyInfo = stub(context.logger, "info");
		const spyDispatch = stub(context.eventDispatcher, "dispatch");
		stub(context.triggers, "call").resolvedValue({
			validators: [{ publicKey: "publicKey1", validator: { username: "username1" } }],
		});

		assert.false(context.sandbox.app.isBound(Identifiers.Forger.Usernames));

		// @ts-ignore
		await context.forgerService.boot([{ publicKey: "publicKey2" }]);
		await context.forgerService.dispose();

		assert.equal(context.sandbox.app.get(Identifiers.Forger.Usernames), { ["publicKey1"]: "username1" });
		spyDispatch.calledWith(Enums.ForgerEvent.Started, { activeValidators: ["publicKey2"] }); // TODO: Check why field is named activeValidators
		spyInfo.calledWith(match("Loaded 1 inactive validator"));
		spyInfo.calledWith("Forger Manager started.");
	});

	it("#checkSlot - should return if stopped", async (context) => {
		const spyOnCall = stub(context.triggers, "call");

		await context.forgerService.dispose();
		await context.forgerService.checkSlot();

		spyOnCall.neverCalled();
	});

	it("#checkSlot - should check later if can't forge", async (context) => {
		const spyCheckSlot = spy(context.forgerService, "checkSlot");
		stub(context.triggers, "call").resolvedValue({
			canForge: false,
			validators: [{ publicKey: "publicKey1", validator: { username: "username1" } }],
		});

		await context.forgerService.checkSlot();

		await AppUtils.sleep(300);

		await context.forgerService.dispose();

		spyCheckSlot.calledTimes(2);
	});

	it("#checkSlot - should check later if is not active validator", async (context) => {
		const spyCheckSlot = spy(context.forgerService, "checkSlot");
		stub(context.triggers, "call").resolvedValue({
			canForge: true,
			currentForger: {
				publicKey: "publicKey3",
			},
			nextForger: {
				publicKey: "publicKey2",
			},
			validators: [{ publicKey: "publicKey1", validator: { username: "username1" } }],
		});
		stub(Utils, "getRemainingSlotTime").returnValue(200);

		await context.forgerService.checkSlot();

		await AppUtils.sleep(300);

		await context.forgerService.dispose();

		spyCheckSlot.calledTimes(2);
	});

	it("#checkSlot - should forceWakeup if nextForger is active validator", async (context) => {
		const spyCheckSlot = spy(context.forgerService, "checkSlot");
		const spyForceWakeup = spy(context.blockchain, "forceWakeup");
		stub(context.triggers, "call").resolvedValue({
			canForge: true,
			currentForger: {
				publicKey: "publicKey3",
			},
			nextForger: {
				publicKey: "publicKey1",
			},
			validators: [{ publicKey: "publicKey1", validator: { username: "username1" } }],
		});
		stub(Utils, "getRemainingSlotTime").returnValue(200);

		// @ts-ignore
		await context.forgerService.boot([{ publicKey: "publicKey1" }]);

		await context.forgerService.checkSlot();

		await context.forgerService.dispose();

		spyCheckSlot.calledOnce();
		spyForceWakeup.calledOnce();
	});

	it("#checkSlot - should forge new block if forging allowed", async (context) => {
		const getCurrentRoundResponse = {
			canForge: true,
			currentForger: {
				publicKey: "publicKey1",
			},
			lastBlock: {
				height: 1,
			},
			nextForger: {
				publicKey: "publicKey2",
			},
			validators: [{ publicKey: "publicKey1", validator: { username: "username1" } }],
		};

		const isForgingAllowedResponse = true;
		const forgeNewBlockRespone = {};

		const spyCall = stub(context.triggers, "call")
			.resolvedValueNth(0, getCurrentRoundResponse)
			.resolvedValueNth(1, getCurrentRoundResponse)
			.resolvedValueNth(2, isForgingAllowedResponse)
			.resolvedValueNth(3, forgeNewBlockRespone);
		stub(context.networkMonitor, "getNetworkState").returnValue({
			getNodeHeight: () => 1,
		});
		stub(Utils, "getRemainingSlotTime").returnValue(200);
		const spyCheckSlot = spy(context.forgerService, "checkSlot");

		// @ts-ignore
		await context.forgerService.boot([{ publicKey: "publicKey1" }]);

		await context.forgerService.checkSlot();

		await context.forgerService.dispose();

		spyCheckSlot.calledOnce();
		spyCall.calledWith("isForgingAllowed");
		spyCall.calledWith("forgeNewBlock");
		spyCall.calledTimes(4);
	});

	it("#checkSlot - should not forge new block if forging is not allowed", async (context) => {
		const getCurrentRoundResponse = {
			canForge: true,
			currentForger: {
				publicKey: "publicKey1",
			},
			lastBlock: {
				height: 1,
			},
			nextForger: {
				publicKey: "publicKey2",
			},
			validators: [{ publicKey: "publicKey1", validator: { username: "username1" } }],
		};

		const isForgingAllowedResponse = false;
		const forgeNewBlockRespone = true;

		const spyCall = stub(context.triggers, "call")
			.resolvedValueNth(0, getCurrentRoundResponse)
			.resolvedValueNth(1, getCurrentRoundResponse)
			.resolvedValueNth(2, isForgingAllowedResponse)
			.resolvedValueNth(3, forgeNewBlockRespone);
		stub(context.networkMonitor, "getNetworkState").returnValue({
			getNodeHeight: () => 1,
		});
		stub(Utils, "getRemainingSlotTime").returnValue(200);
		const spyCheckSlot = spy(context.forgerService, "checkSlot");

		// @ts-ignore
		await context.forgerService.boot([{ publicKey: "publicKey1" }]);

		await context.forgerService.checkSlot();

		await context.forgerService.dispose();

		spyCheckSlot.calledOnce();
		spyCall.calledWith("isForgingAllowed");
		spyCall.notCalledWith("forgeNewBlock");
		spyCall.calledTimes(3);
	});
});
