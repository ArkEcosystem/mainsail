import { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

import { describe, getAttributeRepository } from "../../../test-framework";
import { Wallet, WalletEvent } from ".";

describe<{
	attributeMap: Contracts.State.IAttributeRepository;
}>("Models - Wallet", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.attributeMap = getAttributeRepository();
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
		const customAttributeSet = getAttributeRepository();
		customAttributeSet.set("customAttribute", Contracts.State.AttributeType.Object);

		const address = "Abcde";
		const wallet = new Wallet(address, customAttributeSet);
		const testAttribute = { test: true };

		assert.false(wallet.isChanged());
		wallet.setAttribute("customAttribute", testAttribute);

		assert.true(wallet.isChanged());
		assert.true(wallet.hasAttribute("customAttribute"));
		assert.equal(wallet.getAttribute("customAttribute"), testAttribute);

		wallet.forgetAttribute("customAttribute");

		assert.false(wallet.hasAttribute("customAttribute"));
	});

	it("should set is changed when forget known attributes", (context) => {
		const customAttributeSet = getAttributeRepository();
		customAttributeSet.set("customAttribute", Contracts.State.AttributeType.Object);

		const address = "Abcde";
		const wallet = new Wallet(address, customAttributeSet);
		const testAttribute = { test: true };

		wallet.setAttribute("customAttribute", testAttribute);

		const clone = wallet.clone();
		assert.false(clone.isChanged());

		clone.forgetAttribute("customAttribute");
		assert.true(clone.isChanged());
	});

	// TODO: Change behavior to not set isChanged when forgetting unknown attributes
	it("should set is changed when forget unknown attributes", (context) => {
		const customAttributeSet = getAttributeRepository();
		customAttributeSet.set("customAttribute", Contracts.State.AttributeType.Object);

		const address = "Abcde";
		const wallet = new Wallet(address, customAttributeSet);

		assert.false(wallet.isChanged());

		wallet.forgetAttribute("customAttribute");
		assert.true(wallet.isChanged());
	});

	it("should get all attributes", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.false(wallet.isChanged());
		wallet.setAttribute("multiSignature", {});
		wallet.setAttribute("vote", "publicKey");

		assert.true(wallet.isChanged());
		assert.equal(wallet.getAttributes(), {
			balance: BigNumber.ZERO,
			multiSignature: {},
			nonce: BigNumber.ZERO,
			vote: "publicKey",
		});
	});

	it("should return whether wallet is validator", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.false(wallet.isValidator());
		wallet.setAttribute("validatorUsername", "username");
		assert.true(wallet.isValidator());
	});

	it("should return whether wallet has voted", (context) => {
		const address = "Abcde";
		const wallet = new Wallet(address, context.attributeMap);

		assert.false(wallet.hasVoted());
		wallet.setAttribute("vote", "publicKey");
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
		assert.true(wallet.isChanged());

		const clone = wallet.clone();

		assert.false(clone.isChanged());
		assert.equal(clone, wallet);
	});
});

describe<{
	app: Application;
	wallet: Wallet;
	events: any;
}>("Original", ({ it, beforeEach, assert, spy }) => {
	beforeEach((context) => {
		context.events = {
			dispatchSync: () => {},
		};

		context.wallet = new Wallet("Abcde", getAttributeRepository(), context.events);
	});

	it("should emit on setAttribute", async (context) => {
		const spyOnEvents = spy(context.events, "dispatchSync");

		context.wallet.setAttribute("validatorUsername", "dummy");

		spyOnEvents.calledOnce();
		spyOnEvents.calledWith(WalletEvent.PropertySet, {
			key: "validatorUsername",
			previousValue: undefined,
			publicKey: undefined,
			value: "dummy",
			wallet: context.wallet,
		});
	});

	it("should emit on forgetAttribute", async (context) => {
		context.wallet.setAttribute("validatorUsername", "dummy");

		const spyOnEvents = spy(context.events, "dispatchSync");

		context.wallet.forgetAttribute("validatorUsername");

		spyOnEvents.calledOnce();
		spyOnEvents.calledWith(WalletEvent.PropertySet, {
			key: "validatorUsername",
			previousValue: "dummy",
			publicKey: undefined,
			wallet: context.wallet,
		});
	});

	it("should clone", async (context) => {
		context.wallet.setAttribute("validatorUsername", "dummy");
		const clone = context.wallet.clone();

		assert.equal(clone.getAddress(), "Abcde");
		assert.equal(clone.getAttribute("validatorUsername"), "dummy");
	});
});

describe<{
	clone: Contracts.State.Wallet;
	events: any;
}>("Clone", ({ it, beforeEach, spy }) => {
	beforeEach(async (context) => {
		context.events = {
			dispatchSync: () => {},
		};

		const wallet = new Wallet("Abcde", getAttributeRepository(), context.events);

		context.clone = wallet.clone();
	});

	it("should not emit on setAttribute", async (context) => {
		const spyOnEvents = spy(context.events, "dispatchSync");

		context.clone.setAttribute("validatorUsername", "dummy");

		spyOnEvents.neverCalled();
	});

	it("should not emit on forgetAttribute", async (context) => {
		const spyOnEvents = spy(context.events, "dispatchSync");

		context.clone.setAttribute("validatorUsername", "dummy");
		context.clone.forgetAttribute("validatorUsername");

		spyOnEvents.neverCalled();
	});
});
