import { Container } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";
import { Enums } from "@mainsail/kernel";

import crypto from "../../core/bin/config/testnet/mainsail/crypto.json";
import { describe } from "../../test-framework";
import { SenderState } from ".";

describe<{
	configuration: any;
	handlerRegistry: any;
	expirationService: any;
	triggers: any;
	emitter: any;
	container: Container;
	transaction: Contracts.Crypto.Transaction;
	config: Configuration;
	blockSerializer: any;
	walletRepository: any;
	stateService: any;
	senderState: SenderState;
}>("SenderState", ({ it, assert, beforeEach, stub, spy, match }) => {
	beforeEach(async (context) => {
		context.configuration = {
			get: () => {},
			getOptional: () => {},
			getRequired: () => {},
		};
		context.handlerRegistry = {
			getActivatedHandlerForData: () => {},
		};
		context.expirationService = {
			getExpirationHeight: () => {},
			isExpired: () => {},
		};
		context.triggers = {
			call: () => {},
		};
		context.emitter = {
			dispatch: () => {},
		};

		context.blockSerializer = {
			headerSize: () => 152,
		};

		context.walletRepository = {};

		context.stateService = {
			createWalletRepositoryBySender: () => context.walletRepository,
		};

		context.container = new Container();
		context.container.bind(Identifiers.PluginConfiguration).toConstantValue(context.configuration);
		context.container.bind(Identifiers.TransactionHandlerRegistry).toConstantValue(context.handlerRegistry);
		context.container.bind(Identifiers.Cryptography.Block.Serializer).toConstantValue(context.blockSerializer);
		context.container.bind(Identifiers.TransactionPoolExpirationService).toConstantValue(context.expirationService);
		context.container.bind(Identifiers.TriggerService).toConstantValue(context.triggers);
		context.container.bind(Identifiers.Kernel.EventDispatcher.Service).toConstantValue(context.emitter);
		context.container.bind(Identifiers.StateService).toConstantValue(context.stateService);
		context.container.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.container.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(crypto);

		context.config = context.container.get(Identifiers.Cryptography.Configuration);

		context.senderState = context.container.resolve(SenderState);
		await context.senderState.configure("sender's public key");

		// @ts-ignore
		context.transaction = {
			data: { network: 30, senderPublicKey: "sender's public key" },
			id: "tx1",
			serialized: Buffer.alloc(10),
			timestamp: 13_600,
		} as Contracts.Crypto.Transaction;
	});

	it("apply - should throw when transaction exceeds maximum byte size", async ({
		senderState,
		transaction,
		configuration,
	}) => {
		stub(configuration, "getRequired").returnValueOnce(0); // maxTransactionByte;

		const promise = senderState.apply(transaction);

		await assert.rejects(() => promise);

		await promise.catch((error) => {
			assert.instance(error, Exceptions.PoolError);
			assert.equal(error.type, "ERR_TOO_LARGE");
		});
	});

	it("apply - should throw when transaction is from wrong network", async ({
		senderState,
		container,
		configuration,
		transaction,
	}) => {
		container.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig({
			...crypto,
			network: {
				pubKeyHash: 123,
			},
		} as unknown as Contracts.Crypto.NetworkConfig);

		stub(configuration, "getRequired").returnValueOnce(1024); // maxTransactionByte;

		const promise = senderState.apply(transaction);

		await assert.rejects(() => promise);

		await promise.catch((error) => {
			assert.instance(error, Exceptions.PoolError);
			assert.equal(error.type, "ERR_WRONG_NETWORK");
		});
	});

	it.skip("apply - should throw when transaction is from future", async (context) => {
		const senderState = context.container.resolve(SenderState);

		stub(context.configuration, "get").returnValue(123); // network.pubKeyHash
		stub(context.configuration, "getRequired").returnValueOnce(1024); // maxTransactionByte;

		const promise = senderState.apply(context.transaction);

		await assert.rejects(() => promise);

		await promise.catch((error) => {
			assert.instance(error, Exceptions.PoolError);
			assert.equal(error.type, "ERR_FROM_FUTURE");
		});
	});

	it("apply - should throw when transaction expired", async ({
		senderState,
		configuration,
		expirationService,
		transaction,
		emitter,
	}) => {
		stub(configuration, "getRequired").returnValueNth(1, 123).returnValueNth(2, 1024); // network.pubKeyHash & maxTransactionByte
		stub(expirationService, "isExpired").returnValueOnce(true);
		stub(expirationService, "getExpirationHeight").returnValueOnce(10);
		const eventSpy = spy(emitter, "dispatch");

		const promise = senderState.apply(transaction);

		await assert.rejects(() => promise);

		await promise.catch((error) => {
			assert.instance(error, Exceptions.PoolError);
			assert.equal(error.type, "ERR_EXPIRED");
		});

		eventSpy.calledTimes(1);
		eventSpy.calledWith(Enums.TransactionEvent.Expired);
	});

	it("apply - should throw when transaction fails to verify", async ({
		senderState,
		configuration,
		expirationService,
		handlerRegistry,
		triggers,
		transaction,
		walletRepository,
	}) => {
		const handler = {};

		stub(configuration, "getRequired").returnValueNth(1, 123).returnValueNth(2, 1024); // network.pubKeyHash & maxTransactionByte
		stub(expirationService, "isExpired").returnValueOnce(false);
		const handlerStub = stub(handlerRegistry, "getActivatedHandlerForData").resolvedValue(handler);
		const triggersStub = stub(triggers, "call").resolvedValue(false); // verifyTransaction

		const promise = senderState.apply(transaction);

		await assert.rejects(() => promise);

		await promise.catch((error) => {
			assert.instance(error, Exceptions.PoolError);
			assert.equal(error.type, "ERR_BAD_DATA");
		});

		handlerStub.calledWith(transaction.data);
		triggersStub.calledWith("verifyTransaction", {
			handler,
			transaction: transaction,
			walletRepository: walletRepository,
		});
	});

	it.skip("apply - should throw when state is corrupted", async (context) => {
		const senderState = context.container.resolve(SenderState);
		const handler = {};

		stub(context.configuration, "getRequired").returnValueNth(1, 123).returnValueNth(2, 1024); // network.pubKeyHash & maxTransactionByte
		stub(context.expirationService, "isExpired").returnValueOnce(false);
		const handlerStub = stub(context.handlerRegistry, "getActivatedHandlerForData");
		const triggerStub = stub(context.triggers, "call");

		// revert
		handlerStub.resolvedValueNth(0, handler);
		triggerStub.rejectedValueNth(0, new Error("Corrupt it!")); // revertTransaction

		// apply
		handlerStub.resolvedValueNth(1, handler);
		triggerStub.resolvedValueNth(1, true); // verifyTransaction

		await senderState.revert(context.transaction).catch(() => {});
		const promise = senderState.apply(context.transaction);

		await assert.rejects(() => promise);

		await promise.catch((error) => {
			assert.instance(error, Exceptions.PoolError);
			assert.equal(error.type, "ERR_RETRY");
		});

		// handlerStub.calledNthWith(0, context.transaction.data);
		// triggerStub.calledNthWith(0, "revertTransaction", {
		// 	handler,
		// 	transaction: context.transaction,
		// 	walletRepository: context.walletRepository,
		// });

		handlerStub.calledNthWith(1, context.transaction.data);
		triggerStub.calledNthWith(1, "verifyTransaction", {
			handler,
			transaction: context.transaction,
			walletRepository: context.walletRepository,
		});
	});

	it("apply - should throw when transaction fails to apply", async ({
		senderState,
		configuration,
		expirationService,
		handlerRegistry,
		triggers,
		transaction,
		walletRepository,
	}) => {
		const handler = {};

		stub(configuration, "getRequired").returnValueNth(1, 123).returnValueNth(2, 1024); // network.pubKeyHash & maxTransactionByte
		stub(expirationService, "isExpired").returnValueOnce(false);
		const handlerStub = stub(handlerRegistry, "getActivatedHandlerForData").resolvedValueNth(0, handler);

		const triggerStub = stub(triggers, "call");
		triggerStub.resolvedValueNth(0, true); // verifyTransaction
		triggerStub.resolvedValueNth(1, true); // throwIfCannotEnterPool
		triggerStub.rejectedValueNth(2, new Error("Some apply error")); // applyTransaction

		const promise = senderState.apply(transaction);

		await assert.rejects(() => promise);

		await promise.catch((error) => {
			assert.instance(error, Exceptions.PoolError);
			assert.equal(error.type, "ERR_APPLY");
		});

		handlerStub.calledWith(transaction.data);
		triggerStub.calledNthWith(0, "verifyTransaction", {
			handler,
			transaction: transaction,
			walletRepository: walletRepository,
		});
		triggerStub.calledNthWith(1, "throwIfCannotEnterPool", {
			handler,
			transaction: transaction,
			walletRepository: walletRepository,
		});
		triggerStub.calledNthWith(2, "applyTransaction", {
			handler,
			transaction: transaction,
			walletRepository: walletRepository,
		});
	});

	it("apply - should call handler to apply transaction", async ({
		senderState,
		configuration,
		expirationService,
		handlerRegistry,
		triggers,
		transaction,
		walletRepository,
	}) => {
		const handler = {};

		stub(configuration, "getRequired").returnValueNth(1, 123).returnValueNth(2, 1024); // network.pubKeyHash & maxTransactionByte
		stub(expirationService, "isExpired").returnValueOnce(false);
		const handlerStub = stub(handlerRegistry, "getActivatedHandlerForData").resolvedValueNth(0, handler);

		const triggerStub = stub(triggers, "call");
		triggerStub.resolvedValueNth(0, true); // verifyTransaction
		triggerStub.resolvedValueNth(1); // throwIfCannotEnterPool
		triggerStub.resolvedValueNth(2); // applyTransaction

		await senderState.apply(transaction);

		handlerStub.calledWith(transaction.data);
		triggerStub.calledNthWith(0, "verifyTransaction", {
			handler,
			transaction: transaction,
			walletRepository: walletRepository,
		});
		triggerStub.calledNthWith(1, "throwIfCannotEnterPool", {
			handler,
			transaction: transaction,
			walletRepository: walletRepository,
		});
		triggerStub.calledNthWith(2, "applyTransaction", {
			handler,
			transaction: transaction,
			walletRepository: walletRepository,
		});
	});

	it.skip("revert - should call handler to revert transaction", async (context) => {
		const senderState = context.container.resolve(SenderState);
		const handler = {};

		const handlerStub = stub(context.handlerRegistry, "getActivatedHandlerForData").resolvedValue(handler);
		const triggerStub = stub(context.triggers, "call").resolvedValue(); // revertTransaction

		await senderState.revert(context.transaction);

		handlerStub.calledWith(context.transaction.data);
		triggerStub.calledWith("revertTransaction", {
			handler,
			transaction: context.transaction,
			walletRepository: context.walletRepository,
		});
	});
});
