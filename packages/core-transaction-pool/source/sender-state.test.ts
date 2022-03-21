import { Container } from "@arkecosystem/core-container";
import { Contracts, Identifiers, Exceptions } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { BlockTimeCalculator } from "@arkecosystem/core-crypto-time/source/block-time-calculator";
import { Slots } from "@arkecosystem/core-crypto-time/source/slots";
import { Enums } from "@arkecosystem/core-kernel";
import { describe } from "../../core-test-framework";
import { SenderState } from "./";

describe<{
	configuration: any;
	handlerRegistry: any;
	expirationService: any;
	triggers: any;
	emitter: any;
	container: Container;
	transaction: Contracts.Crypto.ITransaction;
	config: Configuration;
	slots: Slots;
}>("SenderState", ({ it, assert, beforeAll, stub, spy }) => {
	beforeAll((context) => {
		context.configuration = {
			get: () => undefined,
			getRequired: () => undefined,
			getOptional: () => undefined,
		};
		context.handlerRegistry = {
			getActivatedHandlerForData: () => undefined,
		};
		context.expirationService = {
			isExpired: () => undefined,
			getExpirationHeight: () => undefined,
		};
		context.triggers = {
			call: () => undefined,
		};
		context.emitter = {
			dispatch: () => undefined,
		};

		context.container = new Container();
		context.container.bind(Identifiers.PluginConfiguration).toConstantValue(context.configuration);
		context.container.bind(Identifiers.TransactionHandlerRegistry).toConstantValue(context.handlerRegistry);
		context.container.bind(Identifiers.TransactionPoolExpirationService).toConstantValue(context.expirationService);
		context.container.bind(Identifiers.TriggerService).toConstantValue(context.triggers);
		context.container.bind(Identifiers.EventDispatcherService).toConstantValue(context.emitter);
		context.container.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.container
			.bind(Identifiers.Cryptography.Time.BlockTimeCalculator)
			.to(BlockTimeCalculator)
			.inSingletonScope();
		context.container.bind(Identifiers.Cryptography.Time.BlockTimeLookup).toConstantValue({
			getBlockTimeLookup: (height: number) => {
				switch (height) {
					case 1:
						return 0;
					default:
						throw new Error(`Test scenarios should not hit this line`);
				}
			},
		});

		context.config = context.container.get(Identifiers.Cryptography.Configuration);
		context.slots = context.container.resolve(Slots);

		// @ts-ignore
		context.transaction = {
			id: "tx1",
			timestamp: 13600,
			data: { senderPublicKey: "sender's public key", network: 123 },
			serialized: Buffer.alloc(10),
		} as Contracts.Crypto.ITransaction;
	});

	it("apply - should throw when transaction exceeds maximum byte size", async (context) => {
		const senderState = context.container.resolve(SenderState);

		stub(context.configuration, "getRequired").returnValueOnce(0); // maxTransactionByte;

		const promise = senderState.apply(context.transaction);

		await assert.rejects(() => promise);

		promise.catch((err) => {
			assert.instance(err, Exceptions.PoolError);
			assert.equal(err.type, "ERR_TOO_LARGE");
		});
	});

	it("apply - should throw when transaction is from wrong network", async (context) => {
		const senderState = context.container.resolve(SenderState);

		stub(context.configuration, "get").returnValue(321); // network.pubKeyHash
		stub(context.configuration, "getRequired").returnValueOnce(1024); // maxTransactionByte;

		const promise = senderState.apply(context.transaction);

		await assert.rejects(() => promise);

		promise.catch((err) => {
			assert.instance(err, Exceptions.PoolError);
			assert.equal(err.type, "ERR_WRONG_NETWORK");
		});
	});

	it.skip("apply - should throw when transaction is from future", async (context) => {
		const senderState = context.container.resolve(SenderState);

		stub(context.configuration, "get").returnValue(123); // network.pubKeyHash
		stub(context.slots, "getTime").returnValue(9999);
		stub(context.configuration, "getRequired").returnValueOnce(1024); // maxTransactionByte;

		const promise = senderState.apply(context.transaction);

		await assert.rejects(() => promise);

		promise.catch((err) => {
			assert.instance(err, Exceptions.PoolError);
			assert.equal(err.type, "ERR_FROM_FUTURE");
		});
	});

	it("apply - should throw when transaction expired", async (context) => {
		const senderState = context.container.resolve(SenderState);

		stub(context.configuration, "get").returnValue(123); // network.pubKeyHash
		stub(context.slots, "getTime").returnValue(13600);
		stub(context.configuration, "getRequired").returnValueOnce(1024); // maxTransactionByte;
		stub(context.expirationService, "isExpired").returnValueOnce(true);
		stub(context.expirationService, "getExpirationHeight").returnValueOnce(10);
		const eventSpy = spy(context.emitter, "dispatch");

		const promise = senderState.apply(context.transaction);

		await assert.rejects(() => promise);

		promise.catch((err) => {
			assert.instance(err, Exceptions.PoolError);
			assert.equal(err.type, "ERR_EXPIRED");
		});

		eventSpy.calledTimes(1);
		eventSpy.calledWith(Enums.TransactionEvent.Expired);
	});

	it("apply - should throw when transaction fails to verify", async (context) => {
		const senderState = context.container.resolve(SenderState);
		const handler = {};

		stub(context.configuration, "get").returnValue(123); // network.pubKeyHash
		stub(context.slots, "getTime").returnValue(13600);
		stub(context.configuration, "getRequired").returnValueOnce(1024); // maxTransactionByte;
		stub(context.expirationService, "isExpired").returnValueOnce(false);
		const handlerStub = stub(context.handlerRegistry, "getActivatedHandlerForData").resolvedValue(handler);
		const triggersStub = stub(context.triggers, "call").resolvedValue(false); // verifyTransaction

		const promise = senderState.apply(context.transaction);

		await assert.rejects(() => promise);

		promise.catch((err) => {
			assert.instance(err, Exceptions.PoolError);
			assert.equal(err.type, "ERR_BAD_DATA");
		});

		handlerStub.calledWith(context.transaction.data);
		triggersStub.calledWith("verifyTransaction", { handler, transaction: context.transaction });
	});

	it("apply - should throw when state is corrupted", async (context) => {
		const senderState = context.container.resolve(SenderState);
		const handler = {};

		stub(context.configuration, "get").returnValue(123); // network.pubKeyHash
		stub(context.slots, "getTime").returnValue(13600);
		stub(context.configuration, "getRequired").returnValueOnce(1024); // maxTransactionByte;
		stub(context.expirationService, "isExpired").returnValueOnce(false);
		const handlerStub = stub(context.handlerRegistry, "getActivatedHandlerForData");
		const triggerStub = stub(context.triggers, "call");

		// revert
		handlerStub.resolvedValueNth(0, handler);
		triggerStub.rejectedValueNth(0, new Error("Corrupt it!")); // revertTransaction

		// apply
		handlerStub.resolvedValueNth(1, handler);
		triggerStub.resolvedValueNth(1, true); // verifyTransaction

		await senderState.revert(context.transaction).catch(() => undefined);
		const promise = senderState.apply(context.transaction);

		await assert.rejects(() => promise);

		promise.catch((err) => {
			assert.instance(err, Exceptions.PoolError);
			assert.equal(err.type, "ERR_RETRY");
		});

		handlerStub.calledNthWith(0, context.transaction.data);
		triggerStub.calledNthWith(0, "revertTransaction", { handler, transaction: context.transaction });

		handlerStub.calledNthWith(1, context.transaction.data);
		triggerStub.calledNthWith(1, "verifyTransaction", { handler, transaction: context.transaction });
	});

	it("apply - should throw when transaction fails to apply", async (context) => {
		const senderState = context.container.resolve(SenderState);
		const handler = {};

		stub(context.configuration, "get").returnValue(123); // network.pubKeyHash
		stub(context.slots, "getTime").returnValue(13600);
		stub(context.configuration, "getRequired").returnValueOnce(1024); // maxTransactionByte;
		stub(context.expirationService, "isExpired").returnValueOnce(false);
		const handlerStub = stub(context.handlerRegistry, "getActivatedHandlerForData").resolvedValueNth(0, handler);

		const triggerStub = stub(context.triggers, "call");
		triggerStub.resolvedValueNth(0, true); // verifyTransaction
		triggerStub.resolvedValueNth(1, undefined); // throwIfCannotEnterPool
		triggerStub.rejectedValueNth(2, new Error("Some apply error")); // applyTransaction

		const promise = senderState.apply(context.transaction);

		await assert.rejects(() => promise);

		promise.catch((err) => {
			assert.instance(err, Exceptions.PoolError);
			assert.equal(err.type, "ERR_APPLY");
		});

		handlerStub.calledWith(context.transaction.data);
		triggerStub.calledNthWith(0, "verifyTransaction", { handler, transaction: context.transaction });
		triggerStub.calledNthWith(1, "throwIfCannotEnterPool", { handler, transaction: context.transaction });
		triggerStub.calledNthWith(2, "applyTransaction", { handler, transaction: context.transaction });
	});

	it("apply - should call handler to apply transaction", async (context) => {
		const senderState = context.container.resolve(SenderState);
		const handler = {};

		stub(context.configuration, "get").returnValue(123); // network.pubKeyHash
		stub(context.slots, "getTime").returnValue(13600);
		stub(context.configuration, "getRequired").returnValueOnce(1024); // maxTransactionByte;
		stub(context.expirationService, "isExpired").returnValueOnce(false);
		const handlerStub = stub(context.handlerRegistry, "getActivatedHandlerForData").resolvedValueNth(0, handler);

		const triggerStub = stub(context.triggers, "call");
		triggerStub.resolvedValueNth(0, true); // verifyTransaction
		triggerStub.resolvedValueNth(1, undefined); // throwIfCannotEnterPool
		triggerStub.resolvedValueNth(2, undefined); // applyTransaction

		await senderState.apply(context.transaction);

		handlerStub.calledWith(context.transaction.data);
		triggerStub.calledNthWith(0, "verifyTransaction", { handler, transaction: context.transaction });
		triggerStub.calledNthWith(1, "throwIfCannotEnterPool", { handler, transaction: context.transaction });
		triggerStub.calledNthWith(2, "applyTransaction", { handler, transaction: context.transaction });
	});

	it("revert - should call handler to revert transaction", async (context) => {
		const senderState = context.container.resolve(SenderState);
		const handler = {};

		const handlerStub = stub(context.handlerRegistry, "getActivatedHandlerForData").resolvedValue(handler);
		const triggerStub = stub(context.triggers, "call").resolvedValue(undefined); // revertTransaction

		await senderState.revert(context.transaction);

		handlerStub.calledWith(context.transaction.data);
		triggerStub.calledWith("revertTransaction", { handler, transaction: context.transaction });
	});
});
