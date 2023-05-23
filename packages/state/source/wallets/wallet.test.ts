import { Contracts, Identifiers } from "@mainsail/contracts";
import { Application, Services } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";
import { SinonSpy } from "sinon";

import { describe, getWalletAttributeSet } from "../../../test-framework";
import { setUp } from "../../test/setup";
import { Wallet, WalletEvent } from ".";

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
		assert.false(wallet.isChanged());

		wallet.setPublicKey("publicKey");
		assert.equal(wallet.getPublicKey(), "publicKey");
		assert.true(wallet.isChanged());
	});

	it("should set and get balance", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.equal(wallet.getBalance(), BigNumber.ZERO);
		assert.false(wallet.isChanged());

		wallet.setBalance(BigNumber.ONE);
		assert.equal(wallet.getBalance(), BigNumber.ONE);
		assert.true(wallet.isChanged());
	});

	it("should set and get nonce", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.equal(wallet.getNonce(), BigNumber.ZERO);
		assert.false(wallet.isChanged());

		wallet.setNonce(BigNumber.ONE);
		assert.equal(wallet.getNonce(), BigNumber.ONE);
		assert.true(wallet.isChanged());
	});

	it("should increase balance", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.equal(wallet.getBalance(), BigNumber.ZERO);
		assert.false(wallet.isChanged());

		assert.equal(wallet.increaseBalance(BigNumber.ONE), wallet);
		assert.equal(wallet.getBalance(), BigNumber.ONE);
		assert.true(wallet.isChanged());
	});

	it("should decrease balance", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.equal(wallet.getBalance(), BigNumber.ZERO);
		assert.false(wallet.isChanged());

		assert.equal(wallet.decreaseBalance(BigNumber.ONE), wallet);
		assert.equal(wallet.getBalance(), BigNumber.make("-1"));
		assert.true(wallet.isChanged());
	});

	it("should increase nonce", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.equal(wallet.getNonce(), BigNumber.ZERO);
		assert.false(wallet.isChanged());

		wallet.increaseNonce();

		assert.equal(wallet.getNonce(), BigNumber.ONE);
		assert.true(wallet.isChanged());
	});

	it("should decrease nonce", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.equal(wallet.getNonce(), BigNumber.ZERO);
		assert.false(wallet.isChanged());

		wallet.decreaseNonce();
		assert.equal(wallet.getNonce(), BigNumber.make("-1"));
		assert.true(wallet.isChanged());
	});

	it("should get, set and forget custom attributes", (context) => {
		const customAttributeSet = getWalletAttributeSet();
		customAttributeSet.set("customAttribute");
		const custromAttributeMap = new Services.Attributes.AttributeMap(customAttributeSet);

		const address = "Abcde";
		const wallet = new Wallet(address, custromAttributeMap);
		const testAttribute = { test: true };

		assert.false(wallet.isChanged());
		wallet.setAttribute("customAttribute", testAttribute);

		assert.true(wallet.isChanged());
		assert.true(wallet.hasAttribute("customAttribute"));
		assert.equal(wallet.getAttribute("customAttribute"), testAttribute);

		wallet.forgetAttribute("customAttribute");

		assert.false(wallet.hasAttribute("customAttribute"));

		customAttributeSet.forget("customAttribute");

		assert.throws(() => wallet.hasAttribute("customAttribute"));
		assert.throws(() => wallet.getAttribute("customAttribute"));
	});

	it("should set is changed when forget known attributes", (context) => {
		const customAttributeSet = getWalletAttributeSet();
		customAttributeSet.set("customAttribute");
		const custromAttributeMap = new Services.Attributes.AttributeMap(customAttributeSet);

		const address = "Abcde";
		const wallet = new Wallet(address, custromAttributeMap);
		const testAttribute = { test: true };

		wallet.setAttribute("customAttribute", testAttribute);

		const clone = wallet.clone();
		assert.false(clone.isChanged());

		clone.forgetAttribute("customAttribute");
		assert.true(clone.isChanged());
	});

	it("should set is changed when forget unknown attributes", (context) => {
		const customAttributeSet = getWalletAttributeSet();
		customAttributeSet.set("customAttribute");
		const custromAttributeMap = new Services.Attributes.AttributeMap(customAttributeSet);

		const address = "Abcde";
		const wallet = new Wallet(address, custromAttributeMap);

		assert.false(wallet.isChanged());

		wallet.forgetAttribute("customAttribute");
		assert.true(wallet.isChanged());
	});

	it("should get all attributes", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.false(wallet.isChanged());
		wallet.setAttribute("validator", {});
		wallet.setAttribute("vote", {});

		assert.true(wallet.isChanged());
		assert.equal(wallet.getAttributes(), { validator: {}, vote: {} });
	});

	it("should return whether wallet is validator", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.false(wallet.isValidator());
		wallet.setAttribute("validator", {});
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
		wallet.setPublicKey();
		assert.true(wallet.isChanged());

		const clone = wallet.clone();

		assert.false(clone.isChanged());
		clone.setPublicKey();
		assert.true(clone.isChanged());

		assert.equal(clone, wallet);
	});
});

describe<{
	app: Application;
	wallet: Wallet;
	dispatchSyncSpy: SinonSpy;
}>("Original", ({ it, beforeAll, beforeEach, assert, afterEach }) => {
	beforeAll(async (context) => {
		const environment = await setUp();

		context.app = environment.sandbox.app;
		context.dispatchSyncSpy = environment.spies.dispatchSyncSpy;
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
				key: "publicKey",
				previousValue: undefined,
				publicKey: "dummyPublicKey",
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
				key: "balance",
				previousValue: BigNumber.ZERO,
				publicKey: undefined,
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
				key: "balance",
				previousValue: BigNumber.ZERO,
				publicKey: undefined,
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
				key: "balance",
				previousValue: BigNumber.ZERO,
				publicKey: undefined,
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
				key: "nonce",
				previousValue: BigNumber.ZERO,
				publicKey: undefined,
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
				key: "nonce",
				previousValue: BigNumber.ZERO,
				publicKey: undefined,
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
				key: "nonce",
				previousValue: BigNumber.ZERO,
				publicKey: undefined,
				value: BigNumber.make("-1"),
				wallet: context.wallet,
			}),
		);
	});

	it("should emit on setAttribute", async (context) => {
		context.wallet.setAttribute("validator.username", "dummy");

		assert.true(context.dispatchSyncSpy.calledOnce);
		assert.true(
			context.dispatchSyncSpy.calledWith(WalletEvent.PropertySet, {
				key: "validator.username",
				publicKey: undefined,
				value: "dummy",
				wallet: context.wallet,
			}),
		);
	});

	it("should emit on forgetAttribute", async (context) => {
		context.wallet.setAttribute("validator.username", "dummy");
		context.wallet.forgetAttribute("validator.username");

		assert.true(context.dispatchSyncSpy.calledTwice);
		assert.true(
			context.dispatchSyncSpy.calledWith(WalletEvent.PropertySet, {
				key: "validator.username",
				previousValue: "dummy",
				publicKey: undefined,
				wallet: context.wallet,
			}),
		);
	});

	it("should clone", async (context) => {
		context.wallet.setAttribute("validator.username", "dummy");
		const clone = context.wallet.clone();

		assert.equal(clone.getAddress(), "Abcde");
		assert.equal(clone.getAttribute("validator.username"), "dummy");
	});
});

describe<{
	app: Application;
	clone: Contracts.State.Wallet;
	dispatchSyncSpy: SinonSpy;
}>("Clone", ({ it, beforeAll, beforeEach, afterEach, assert }) => {
	beforeAll(async (context) => {
		const environment = await setUp();

		context.app = environment.sandbox.app;
		context.dispatchSyncSpy = environment.spies.dispatchSyncSpy;
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
		context.clone.setAttribute("validator.username", "dummy");

		assert.false(context.dispatchSyncSpy.called);
	});

	it("should emit on forgetAttribute", async (context) => {
		context.clone.setAttribute("validator.username", "dummy");
		context.clone.forgetAttribute("validator.username");

		assert.false(context.dispatchSyncSpy.called);
	});
});
