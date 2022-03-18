import { Application, Services } from "@arkecosystem/core-kernel";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { describe, describeSkip, getWalletAttributeSet } from "../../../core-test-framework";
import { SinonSpy } from "sinon";
import { BigNumber } from "@arkecosystem/utils";

import { setUp } from "../../test/setup";
import { Wallet, WalletEvent } from "../wallets";

describe<{
	attributeMap: Services.Attributes.AttributeMap;
}>("Models - Wallet", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.attributeMap = new Services.Attributes.AttributeMap(getWalletAttributeSet());
	});

	it("returns the address", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.equal(wallet.getAddress(), address);
	});

	it("should set and get publicKey", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.undefined(wallet.getPublicKey());

		wallet.setPublicKey("publicKey");
		assert.equal(wallet.getPublicKey(), "publicKey");
	});

	it.only("should set and get balance", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.equal(wallet.getBalance(), BigNumber.ZERO);

		wallet.setBalance(BigNumber.ONE);
		assert.equal(wallet.getBalance(), BigNumber.ONE);
	});

	it("should set and get nonce", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.equal(wallet.getNonce(), BigNumber.ZERO);

		wallet.setNonce(BigNumber.ONE);
		assert.equal(wallet.getNonce(), BigNumber.ONE);
	});

	it("should increase balance", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.equal(wallet.getBalance(), BigNumber.ZERO);

		assert.equal(wallet.increaseBalance(BigNumber.ONE), wallet);
		assert.equal(wallet.getBalance(), BigNumber.ONE);
	});

	it("should decrease balance", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.equal(wallet.getBalance(), BigNumber.ZERO);
		assert.equal(wallet.decreaseBalance(BigNumber.ONE), wallet);
		assert.equal(wallet.getBalance(), BigNumber.make("-1"));
	});

	it("should increase nonce", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.equal(wallet.getNonce(), BigNumber.ZERO);

		wallet.increaseNonce();

		assert.equal(wallet.getNonce(), BigNumber.ONE);
	});

	it("should decrease nonce", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.equal(wallet.getNonce(), BigNumber.ZERO);

		wallet.decreaseNonce();
		assert.equal(wallet.getNonce(), BigNumber.make("-1"));
	});

	it("should get, set and forget custom attributes", (context) => {
		const customAttributeSet = getWalletAttributeSet();
		customAttributeSet.set("customAttribute");
		const custromAttributeMap = new Services.Attributes.AttributeMap(customAttributeSet);

		const address = "Abcde";
		const wallet = new Wallet(address, custromAttributeMap);
		const testAttribute = { test: true };
		wallet.setAttribute("customAttribute", testAttribute);

		assert.true(wallet.hasAttribute("customAttribute"));
		assert.equal(wallet.getAttribute("customAttribute"), testAttribute);

		wallet.forgetAttribute("customAttribute");

		assert.false(wallet.hasAttribute("customAttribute"));

		customAttributeSet.forget("customAttribute");

		assert.throws(() => wallet.hasAttribute("customAttribute"));
		assert.throws(() => wallet.getAttribute("customAttribute"));
	});

	it("should get all attributes", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		wallet.setAttribute("delegate", {});
		wallet.setAttribute("vote", {});

		assert.equal(wallet.getAttributes(), { delegate: {}, vote: {} });
	});

	it("should return whether wallet is delegate", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.false(wallet.isValidator());
		wallet.setAttribute("delegate", {});
		assert.true(wallet.isValidator());
	});

	it("should return whether wallet has voted", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.false(wallet.hasVoted());
		wallet.setAttribute("vote", {});
		assert.true(wallet.hasVoted());
	});

	it("should return whether the wallet has multisignature", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.false(wallet.hasMultiSignature());
		wallet.setAttribute("multiSignature", {});
		assert.true(wallet.hasMultiSignature());
	});

	it("should be cloneable", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);
		wallet.setPublicKey("test");

		assert.equal(wallet.clone(), wallet);
	});
});

describeSkip<{
	app: Application;
	wallet: Wallet;
	dispatchSyncSpy: SinonSpy;
}>("Original", ({ it, beforeAll, beforeEach, assert, afterEach }) => {
	beforeAll(async (context) => {
		const env = await setUp();

		context.app = env.sandbox.app;
		context.dispatchSyncSpy = env.spies.dispatchSyncSpy;
	});

	beforeEach((context) => {
		const attributeMap = new Services.Attributes.AttributeMap(getWalletAttributeSet());
		const events = context.app.get<Contracts.Kernel.EventDispatcher>(Identifiers.EventDispatcherService);

		context.wallet = new Wallet("Abcde", attributeMap, events);
	});

	afterEach((context) => {
		context.dispatchSyncSpy.resetHistory();
	});

	it("should emit on setPublicKey", async (context) => {
		context.wallet.setPublicKey("dummyPublicKey");

		assert.true(context.dispatchSyncSpy.calledOnce);

		assert.true(
			context.dispatchSyncSpy.calledWith(WalletEvent.PropertySet, {
				publicKey: "dummyPublicKey",
				key: "publicKey",
				previousValue: undefined,
				value: "dummyPublicKey",
				wallet: context.wallet,
			}),
		);
	});

	it("should emit on setBalance", async (context) => {
		context.wallet.setBalance(BigNumber.ONE);

		assert.true(context.dispatchSyncSpy.calledOnce);
		assert.true(
			context.dispatchSyncSpy.calledWith(WalletEvent.PropertySet, {
				publicKey: undefined,
				key: "balance",
				previousValue: BigNumber.ZERO,
				value: BigNumber.ONE,
				wallet: context.wallet,
			}),
		);
	});

	it("should emit on increaseBalance", async (context) => {
		context.wallet.increaseBalance(BigNumber.ONE);

		assert.true(context.dispatchSyncSpy.calledOnce);
		assert.true(
			context.dispatchSyncSpy.calledWith(WalletEvent.PropertySet, {
				publicKey: undefined,
				key: "balance",
				previousValue: BigNumber.ZERO,
				value: BigNumber.ONE,
				wallet: context.wallet,
			}),
		);
	});

	it("should emit on decreaseBalance", async (context) => {
		context.wallet.decreaseBalance(BigNumber.ONE);

		assert.true(context.dispatchSyncSpy.calledOnce);
		assert.true(
			context.dispatchSyncSpy.calledWith(WalletEvent.PropertySet, {
				publicKey: undefined,
				key: "balance",
				previousValue: BigNumber.ZERO,
				value: BigNumber.make("-1"),
				wallet: context.wallet,
			}),
		);
	});

	it("should emit on setNonce", async (context) => {
		context.wallet.setNonce(BigNumber.ONE);

		assert.true(context.dispatchSyncSpy.calledOnce);
		assert.true(
			context.dispatchSyncSpy.calledWith(WalletEvent.PropertySet, {
				publicKey: undefined,
				key: "nonce",
				previousValue: BigNumber.ZERO,
				value: BigNumber.ONE,
				wallet: context.wallet,
			}),
		);
	});

	it("should emit on increaseNonce", async (context) => {
		context.wallet.increaseNonce();

		assert.true(context.dispatchSyncSpy.calledOnce);
		assert.true(
			context.dispatchSyncSpy.calledWith(WalletEvent.PropertySet, {
				publicKey: undefined,
				key: "nonce",
				previousValue: BigNumber.ZERO,
				value: BigNumber.ONE,
				wallet: context.wallet,
			}),
		);
	});

	it("should emit on decreaseNonce", async (context) => {
		context.wallet.decreaseNonce();

		assert.true(context.dispatchSyncSpy.calledOnce);
		assert.true(
			context.dispatchSyncSpy.calledWith(WalletEvent.PropertySet, {
				publicKey: undefined,
				key: "nonce",
				previousValue: BigNumber.ZERO,
				value: BigNumber.make("-1"),
				wallet: context.wallet,
			}),
		);
	});

	it("should emit on setAttribute", async (context) => {
		context.wallet.setAttribute("delegate.username", "dummy");

		assert.true(context.dispatchSyncSpy.calledOnce);
		assert.true(
			context.dispatchSyncSpy.calledWith(WalletEvent.PropertySet, {
				publicKey: undefined,
				key: "delegate.username",
				value: "dummy",
				wallet: context.wallet,
			}),
		);
	});

	it("should emit on forgetAttribute", async (context) => {
		context.wallet.setAttribute("delegate.username", "dummy");
		context.wallet.forgetAttribute("delegate.username");

		assert.true(context.dispatchSyncSpy.calledTwice);
		assert.true(
			context.dispatchSyncSpy.calledWith(WalletEvent.PropertySet, {
				publicKey: undefined,
				key: "delegate.username",
				previousValue: "dummy",
				wallet: context.wallet,
			}),
		);
	});

	it("should clone", async (context) => {
		context.wallet.setAttribute("delegate.username", "dummy");
		const clone = context.wallet.clone();

		assert.equal(clone.getAddress(), "Abcde");
		assert.equal(clone.getAttribute("delegate.username"), "dummy");
	});
});

describeSkip<{
	app: Application;
	clone: Contracts.State.Wallet;
	dispatchSyncSpy: SinonSpy;
}>("Clone", ({ it, beforeAll, beforeEach, afterEach, assert }) => {
	beforeAll(async (context) => {
		const env = await setUp();

		context.app = env.sandbox.app;
		context.dispatchSyncSpy = env.spies.dispatchSyncSpy;
	});

	beforeEach((context) => {
		const attributeMap = new Services.Attributes.AttributeMap(getWalletAttributeSet());
		const events = context.app.get<Contracts.Kernel.EventDispatcher>(Identifiers.EventDispatcherService);

		const wallet = new Wallet("Abcde", attributeMap, events);

		context.clone = wallet.clone();
	});

	afterEach((context) => {
		context.dispatchSyncSpy.resetHistory();
	});

	it("should emit on property set", async (context) => {
		// @ts-ignore
		context.clone.nonce = BigNumber.make("3");

		assert.false(context.dispatchSyncSpy.called);
	});

	it("should emit on setAttribute", async (context) => {
		context.clone.setAttribute("delegate.username", "dummy");

		assert.false(context.dispatchSyncSpy.called);
	});

	it("should emit on forgetAttribute", async (context) => {
		context.clone.setAttribute("delegate.username", "dummy");
		context.clone.forgetAttribute("delegate.username");

		assert.false(context.dispatchSyncSpy.called);
	});
});
