import { BigNumber } from "@mainsail/utils";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Wallet } from ".";

describe<{
	app: Application;
	evm: any;
}>("Models - Wallet", ({ it, assert, beforeEach, stub }) => {
	beforeEach((context) => {
		context.evm = {
			getAccountInfo: async () => ({ balance: 0n, nonce: 0n }),
			getAccountInfoExtended: async () => ({ balance: 0n, nonce: 0n, legacyAttributes: {} }),
		};

		context.app = new Application();
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm);
	});

	it("returns the address", async ({ app }) => {
		const address = "Abcde";
		const wallet = await app.resolve(Wallet).init(address);

		assert.equal(wallet.getAddress(), address);
	});

	it("returns the legacy address", async ({ app }) => {
		const address = "Abcde";
		const legacyAddress = "Fghij";
		const wallet = await app.resolve(Wallet).init(address);
		assert.equal(wallet.getAddress(), address);
		assert.undefined(wallet.getLegacyAddress());

		wallet.init(address, legacyAddress);

		assert.equal(wallet.getAddress(), address);
		assert.equal(wallet.getLegacyAddress(), legacyAddress);
	});

	it("should take balance and nonce from emv", async ({ evm, app }) => {
		stub(evm, "getAccountInfoExtended").returnValue({
			balance: 2n,
			nonce: 3n,
			legacyAttributes: {},
		});

		const wallet = await app.resolve(Wallet).init("Abcde");

		assert.equal(wallet.getBalance(), BigNumber.make(2));
		assert.equal(wallet.getNonce(), BigNumber.make(3));
	});

	it("should set and get balance", async ({ app }) => {
		const address = "Abcde";
		const wallet = await app.resolve(Wallet).init(address);

		assert.equal(wallet.getBalance(), BigNumber.ZERO);

		wallet.setBalance(BigNumber.ONE);
		assert.equal(wallet.getBalance(), BigNumber.ONE);
	});

	it("should set and get nonce", async ({ app }) => {
		const address = "Abcde";
		const wallet = await app.resolve(Wallet).init(address);

		assert.equal(wallet.getNonce(), BigNumber.ZERO);

		wallet.setNonce(BigNumber.ONE);
		assert.equal(wallet.getNonce(), BigNumber.ONE);
	});

	it("should increase balance", async ({ app }) => {
		const address = "Abcde";
		const wallet = await app.resolve(Wallet).init(address);

		assert.equal(wallet.getBalance(), BigNumber.ZERO);

		assert.equal(wallet.increaseBalance(BigNumber.ONE), wallet);
		assert.equal(wallet.getBalance(), BigNumber.ONE);
	});

	it("should decrease balance", async ({ app }) => {
		const address = "Abcde";
		const wallet = await app.resolve(Wallet).init(address);

		assert.equal(wallet.getBalance(), BigNumber.ZERO);

		assert.equal(wallet.decreaseBalance(BigNumber.ONE), wallet);
		assert.equal(wallet.getBalance(), BigNumber.make("-1"));
	});

	it("should increase nonce", async ({ app }) => {
		const address = "Abcde";
		const wallet = await app.resolve(Wallet).init(address);

		assert.equal(wallet.getNonce(), BigNumber.ZERO);

		wallet.increaseNonce();

		assert.equal(wallet.getNonce(), BigNumber.ONE);
	});

	it("should decrease nonce", async ({ app }) => {
		const address = "Abcde";
		const wallet = await app.resolve(Wallet).init(address);

		assert.equal(wallet.getNonce(), BigNumber.ZERO);

		wallet.decreaseNonce();
		assert.equal(wallet.getNonce(), BigNumber.make("-1"));
	});

	it("#getLegacyAddress - should get address", async ({ app }) => {
		const legacyAddress = "legacyAddress";
		const wallet = await app.resolve(Wallet).init("Abcde", legacyAddress);

		assert.equal(wallet.getLegacyAddress(), legacyAddress);
	});

	it("#hasLegacySecondPublicKey - should return false", async ({ app }) => {
		const wallet = await app.resolve(Wallet).init("Abcde");

		assert.false(wallet.hasLegacySecondPublicKey());
	});

	it("#hasLegacySecondPublicKey - should return true", async ({ app, evm }) => {
		stub(evm, "getAccountInfoExtended").returnValue({
			balance: 0n,
			nonce: 0n,
			legacyAttributes: {
				secondPublicKey: "secondPublicKey",
			},
		});

		const wallet = await app.resolve(Wallet).init("Abcde");

		assert.true(wallet.hasLegacySecondPublicKey());
	});

	it("#legacySecondPublicKey - should return string", async ({ app, evm }) => {
		stub(evm, "getAccountInfoExtended").returnValue({
			balance: 0n,
			nonce: 0n,
			legacyAttributes: {
				secondPublicKey: "secondPublicKey",
			},
		});

		const wallet = await app.resolve(Wallet).init("Abcde");

		assert.equal(wallet.legacySecondPublicKey(), "secondPublicKey");
	});
});
