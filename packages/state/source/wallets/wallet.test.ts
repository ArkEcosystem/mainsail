import { Contracts, Identifiers } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

import { describe, describeSkip, getAttributeRepository, Sandbox } from "../../../test-framework/source";
import { stateRepositoryFactory } from "../factory";
import { Wallet } from ".";
import { walletFactory } from "./factory";

describe<{
	attributeMap: Contracts.State.AttributeRepository;
	walletRepository: any;
	sandbox: Sandbox;
}>("Models - Wallet", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.attributeMap = getAttributeRepository();
		context.walletRepository = {
			setDirtyWallet: () => {},
		};

		context.sandbox = new Sandbox();
		context.sandbox.app.bind(Identifiers.State.StateRepository.Factory).toFactory(stateRepositoryFactory);
		context.sandbox.app.bind(Identifiers.State.Wallet.Factory).toFactory(walletFactory);
		context.sandbox.app.bind(Identifiers.State.Wallet.Attributes).toConstantValue(getAttributeRepository());
		context.sandbox.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({
			getRequired: () => false, //snapshots.skipUnknownAttributes
		});
	});

	it("returns the address", ({ sandbox, walletRepository }) => {
		const address = "Abcde";
		const wallet = sandbox.app.resolve(Wallet).init(address, walletRepository);

		assert.equal(wallet.getAddress(), address);
	});

	it("should set and get publicKey", ({ sandbox, walletRepository }) => {
		const address = "Abcde";
		const wallet = sandbox.app.resolve(Wallet).init(address, walletRepository);

		assert.undefined(wallet.getPublicKey());
		assert.false(wallet.isChanged());

		wallet.setPublicKey("publicKey");
		assert.equal(wallet.getPublicKey(), "publicKey");
		assert.true(wallet.isChanged());
	});

	it("should set and get balance", ({ sandbox, walletRepository }) => {
		const address = "Abcde";
		const wallet = sandbox.app.resolve(Wallet).init(address, walletRepository);

		assert.equal(wallet.getBalance(), BigNumber.ZERO);
		assert.false(wallet.isChanged());

		wallet.setBalance(BigNumber.ONE);
		assert.equal(wallet.getBalance(), BigNumber.ONE);
		assert.true(wallet.isChanged());
	});

	it("should set and get nonce", ({ sandbox, walletRepository }) => {
		const address = "Abcde";
		const wallet = sandbox.app.resolve(Wallet).init(address, walletRepository);

		assert.equal(wallet.getNonce(), BigNumber.ZERO);
		assert.false(wallet.isChanged());

		wallet.setNonce(BigNumber.ONE);
		assert.equal(wallet.getNonce(), BigNumber.ONE);
		assert.true(wallet.isChanged());
	});

	it("should increase balance", ({ sandbox, walletRepository }) => {
		const address = "Abcde";
		const wallet = sandbox.app.resolve(Wallet).init(address, walletRepository);

		assert.equal(wallet.getBalance(), BigNumber.ZERO);
		assert.false(wallet.isChanged());

		assert.equal(wallet.increaseBalance(BigNumber.ONE), wallet);
		assert.equal(wallet.getBalance(), BigNumber.ONE);
		assert.true(wallet.isChanged());
	});

	it("should decrease balance", ({ sandbox, walletRepository }) => {
		const address = "Abcde";
		const wallet = sandbox.app.resolve(Wallet).init(address, walletRepository);

		assert.equal(wallet.getBalance(), BigNumber.ZERO);
		assert.false(wallet.isChanged());

		assert.equal(wallet.decreaseBalance(BigNumber.ONE), wallet);
		assert.equal(wallet.getBalance(), BigNumber.make("-1"));
		assert.true(wallet.isChanged());
	});

	it("should increase nonce", ({ sandbox, walletRepository }) => {
		const address = "Abcde";
		const wallet = sandbox.app.resolve(Wallet).init(address, walletRepository);

		assert.equal(wallet.getNonce(), BigNumber.ZERO);
		assert.false(wallet.isChanged());

		wallet.increaseNonce();

		assert.equal(wallet.getNonce(), BigNumber.ONE);
		assert.true(wallet.isChanged());
	});

	it("should decrease nonce", ({ sandbox, walletRepository }) => {
		const address = "Abcde";
		const wallet = sandbox.app.resolve(Wallet).init(address, walletRepository);

		assert.equal(wallet.getNonce(), BigNumber.ZERO);
		assert.false(wallet.isChanged());

		wallet.decreaseNonce();
		assert.equal(wallet.getNonce(), BigNumber.make("-1"));
		assert.true(wallet.isChanged());
	});

	it("should get, set and forget custom attributes", ({ sandbox, walletRepository }) => {
		const customAttributeSet = getAttributeRepository();
		customAttributeSet.set("customAttribute", Contracts.State.AttributeType.Object);

		sandbox.app.rebind(Identifiers.State.Wallet.Attributes).toConstantValue(customAttributeSet);

		const address = "Abcde";
		const wallet = sandbox.app.resolve(Wallet).init(address, walletRepository);
		const testAttribute = { test: true };

		assert.false(wallet.isChanged());
		wallet.setAttribute("customAttribute", testAttribute);

		assert.true(wallet.isChanged());
		assert.true(wallet.hasAttribute("customAttribute"));
		assert.equal(wallet.getAttribute("customAttribute"), testAttribute);

		wallet.forgetAttribute("customAttribute");

		assert.false(wallet.hasAttribute("customAttribute"));
	});

	it("should set is changed when forget known attributes", ({ sandbox, walletRepository }) => {
		const customAttributeSet = getAttributeRepository();
		customAttributeSet.set("customAttribute", Contracts.State.AttributeType.Object);

		sandbox.app.rebind(Identifiers.State.Wallet.Attributes).toConstantValue(customAttributeSet);

		const address = "Abcde";
		const wallet = sandbox.app.resolve(Wallet).init(address, walletRepository);
		const testAttribute = { test: true };

		wallet.setAttribute("customAttribute", testAttribute);

		const clone = wallet.clone(walletRepository);
		assert.false(clone.isChanged());

		clone.forgetAttribute("customAttribute");
		assert.true(clone.isChanged());
	});

	it("should not set is changed when forget unknown attributes", ({ sandbox, walletRepository }) => {
		const customAttributeSet = getAttributeRepository();
		customAttributeSet.set("customAttribute", Contracts.State.AttributeType.Object);

		sandbox.app.rebind(Identifiers.State.Wallet.Attributes).toConstantValue(customAttributeSet);

		const address = "Abcde";
		const wallet = sandbox.app.resolve(Wallet).init(address, walletRepository);

		assert.false(wallet.isChanged());

		wallet.forgetAttribute("customAttribute");
		assert.false(wallet.isChanged());
	});

	it("should get all attributes", ({ sandbox, walletRepository }) => {
		const address = "Abcde";
		const wallet = sandbox.app.resolve(Wallet).init(address, walletRepository);

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

	it("should return whether wallet is validator", ({ sandbox, walletRepository }) => {
		const address = "Abcde";
		const wallet = sandbox.app.resolve(Wallet).init(address, walletRepository);

		assert.false(wallet.isValidator());
		wallet.setAttribute("validatorPublicKey", "username");
		assert.true(wallet.isValidator());
	});

	it("should return whether wallet has voted", ({ sandbox, walletRepository }) => {
		const address = "Abcde";
		const wallet = sandbox.app.resolve(Wallet).init(address, walletRepository);

		assert.false(wallet.hasVoted());
		wallet.setAttribute("vote", "publicKey");
		assert.true(wallet.hasVoted());
	});

	it("should return whether the wallet has multisignature", ({ sandbox, walletRepository }) => {
		const address = "Abcde";
		const wallet = sandbox.app.resolve(Wallet).init(address, walletRepository);

		assert.false(wallet.hasMultiSignature());
		wallet.setAttribute("multiSignature", {});
		assert.true(wallet.hasMultiSignature());
	});

	it("should be cloneable", ({ sandbox, walletRepository }) => {
		const address = "Abcde";
		const wallet = sandbox.app.resolve(Wallet).init(address, walletRepository);
		wallet.setPublicKey("test");
		assert.true(wallet.isChanged());

		const clone = wallet.clone();

		assert.false(clone.isChanged());
		assert.equal(clone.getAddress(), wallet.getAddress());
	});
});

describeSkip<{
	app: Application;
	wallet: Wallet;
	events: any;
}>("Original", ({ it, beforeEach, assert, spy }) => {
	beforeEach((context) => {
		context.events = {
			dispatchSync: () => {},
		};

		context.wallet = new Wallet("Abcde", getAttributeRepository());
	});

	it("should clone", async (context) => {
		context.wallet.setAttribute("validatorUsername", "dummy");
		const clone = context.wallet.clone();

		assert.equal(clone.getAddress(), "Abcde");
		assert.equal(clone.getAttribute("validatorUsername"), "dummy");
	});
});

describeSkip<{
	clone: Contracts.State.Wallet;
	events: any;
}>("Clone", ({ beforeEach }) => {
	beforeEach(async (context) => {
		context.events = {
			dispatchSync: () => {},
		};

		const wallet = new Wallet("Abcde", getAttributeRepository(), context.events);

		context.clone = wallet.clone();
	});
});
