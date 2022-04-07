import { Identifiers } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";

import { describe, Sandbox } from "../../core-test-framework";
import { VoteTransactionHandler } from "./handlers";
import { ServiceProvider } from "./index";
import { VoteTransaction } from "./versions/1";

describe<{
	sandbox: Sandbox;
	serviceProvider: ServiceProvider;
	feeRegistry: any;
	transactionRegistry: any;
}>("Index", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.feeRegistry = {
			set: () => {},
		};

		context.transactionRegistry = {
			registerTransactionType: () => {},
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Fee.Registry).toConstantValue(context.feeRegistry);
		context.sandbox.app.bind(Identifiers.Fee.Type).toConstantValue("managed");
		context.sandbox.app
			.bind(Identifiers.Cryptography.Transaction.Registry)
			.toConstantValue(context.transactionRegistry);

		context.serviceProvider = context.sandbox.app.resolve(ServiceProvider);
	});

	it("#register - should register managed fees", async ({ serviceProvider, feeRegistry }) => {
		const spySet = spy(feeRegistry, "set");

		await assert.resolves(() => serviceProvider.register());

		spySet.calledOnce();
		spySet.calledWith(VoteTransaction.key, VoteTransaction.version, BigNumber.make("100"));
	});

	it("#register - should register static fees", async ({ serviceProvider, feeRegistry, sandbox }) => {
		sandbox.app.rebind(Identifiers.Fee.Type).toConstantValue("static");
		const spySet = spy(feeRegistry, "set");

		await assert.resolves(() => serviceProvider.register());

		spySet.calledOnce();
		spySet.calledWith(VoteTransaction.key, VoteTransaction.version, BigNumber.make("100000000"));
	});

	it("#register - should register type", async ({ serviceProvider, transactionRegistry }) => {
		const spyRegisterTransactionType = spy(transactionRegistry, "registerTransactionType");

		await assert.resolves(() => serviceProvider.register());

		spyRegisterTransactionType.calledOnce();
		spyRegisterTransactionType.calledWith(VoteTransaction);
	});

	it("#register - should register handler", async ({ serviceProvider, sandbox }) => {
		assert.false(sandbox.app.isBound(Identifiers.TransactionHandler));

		await assert.resolves(() => serviceProvider.register());

		assert.true(sandbox.app.isBound(Identifiers.TransactionHandler));

		const bindingDictionary = sandbox.app.container["_bindingDictionary"];
		const handlerBindings = bindingDictionary.getMap().get(Identifiers.TransactionHandler) ?? [];
		assert.equal(handlerBindings[0].implementationType, VoteTransactionHandler);
	});
});
