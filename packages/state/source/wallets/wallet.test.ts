import { BigNumber } from "@mainsail/utils";
import { Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../../test-framework/source";
import { Wallet } from ".";

describe<{
	sandbox: Sandbox;
}>("Models - Wallet", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();
		context.sandbox.app.bind(Identifiers.Evm.Instance).toConstantValue({
			getAccountInfo: async () => ({ balance: 0n, nonce: 0n }),
		});
	});

	it("returns the address", async ({ sandbox }) => {
		const address = "Abcde";
		const wallet = await sandbox.app.resolve(Wallet).init(address);

		assert.equal(wallet.getAddress(), address);
	});

	it("should set and get balance", async ({ sandbox }) => {
		const address = "Abcde";
		const wallet = await sandbox.app.resolve(Wallet).init(address);

		assert.equal(wallet.getBalance(), BigNumber.ZERO);

		wallet.setBalance(BigNumber.ONE);
		assert.equal(wallet.getBalance(), BigNumber.ONE);
	});

	it("should set and get nonce", async ({ sandbox }) => {
		const address = "Abcde";
		const wallet = await sandbox.app.resolve(Wallet).init(address);

		assert.equal(wallet.getNonce(), BigNumber.ZERO);

		wallet.setNonce(BigNumber.ONE);
		assert.equal(wallet.getNonce(), BigNumber.ONE);
	});

	it("should increase balance", async ({ sandbox }) => {
		const address = "Abcde";
		const wallet = await sandbox.app.resolve(Wallet).init(address);

		assert.equal(wallet.getBalance(), BigNumber.ZERO);

		assert.equal(wallet.increaseBalance(BigNumber.ONE), wallet);
		assert.equal(wallet.getBalance(), BigNumber.ONE);
	});

	it("should decrease balance", async ({ sandbox }) => {
		const address = "Abcde";
		const wallet = await sandbox.app.resolve(Wallet).init(address);

		assert.equal(wallet.getBalance(), BigNumber.ZERO);

		assert.equal(wallet.decreaseBalance(BigNumber.ONE), wallet);
		assert.equal(wallet.getBalance(), BigNumber.make("-1"));
	});

	it("should increase nonce", async ({ sandbox }) => {
		const address = "Abcde";
		const wallet = await sandbox.app.resolve(Wallet).init(address);

		assert.equal(wallet.getNonce(), BigNumber.ZERO);

		wallet.increaseNonce();

		assert.equal(wallet.getNonce(), BigNumber.ONE);
	});

	it("should decrease nonce", async ({ sandbox }) => {
		const address = "Abcde";
		const wallet = await sandbox.app.resolve(Wallet).init(address);

		assert.equal(wallet.getNonce(), BigNumber.ZERO);

		wallet.decreaseNonce();
		assert.equal(wallet.getNonce(), BigNumber.make("-1"));
	});
});
