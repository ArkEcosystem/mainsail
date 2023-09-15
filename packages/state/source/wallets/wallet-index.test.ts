import { Contracts } from "@mainsail/contracts";

import { describe, Factories } from "../../../test-framework";
import { setUp } from "../../test/setup";
import { Wallets } from "..";
import { WalletIndex } from ".";

describe<{
	factory: Factories.FactoryBuilder;
	wallet: Contracts.State.Wallet;
	walletIndex: WalletIndex;
}>("WalletIndex", ({ it, beforeAll, beforeEach, assert }) => {
	beforeAll(async (context) => {
		const environment = await setUp();

		context.factory = environment.factory;
	});

	beforeEach(async (context) => {
		context.wallet = await context.factory.get("Wallet").make<Wallets.Wallet>();

		context.walletIndex = new WalletIndex();
	});

	it("should return entries", (context) => {
		context.walletIndex.set(context.wallet.getAddress(), context.wallet);
		const entries = context.walletIndex.entries();

		assert.equal(entries.length, 1);
		assert.equal(entries[0][0], entries[0][1].getAddress());
		assert.equal(entries[0][0], context.wallet.getAddress());
	});

	it("should return keys", (context) => {
		context.walletIndex.set(context.wallet.getAddress(), context.wallet);

		assert.true(context.walletIndex.keys().includes(context.wallet.getAddress()));
	});

	it("should return walletKeys", (context) => {
		assert.equal(context.walletIndex.walletKeys(context.wallet), []);

		context.walletIndex.set(context.wallet.getAddress(), context.wallet);

		assert.equal(context.walletIndex.walletKeys(context.wallet), [context.wallet.getAddress()]);
	});

	it("set - should set and get addresses", (context) => {
		assert.false(context.walletIndex.has(context.wallet.getAddress()));

		context.walletIndex.set(context.wallet.getAddress(), context.wallet);

		assert.equal(context.walletIndex.get(context.wallet.getAddress()), context.wallet);
		assert.true(context.walletIndex.has(context.wallet.getAddress()));

		assert.true(context.walletIndex.values().includes(context.wallet));

		context.walletIndex.clear();
		assert.false(context.walletIndex.has(context.wallet.getAddress()));
	});

	it("set - should override key with new wallet", async (context) => {
		const anotherWallet = await context.factory.get("Wallet").make<Wallets.Wallet>();

		context.walletIndex.set("key1", context.wallet);
		context.walletIndex.set("key1", anotherWallet);

		assert.equal(context.walletIndex.get("key1"), anotherWallet);

		const entries = context.walletIndex.entries();

		assert.equal(entries.length, 1);
	});

	it("forget - should index and forget wallets", (context) => {
		assert.false(context.walletIndex.has(context.wallet.getAddress()));

		context.walletIndex.set(context.wallet.getAddress(), context.wallet);
		assert.true(context.walletIndex.has(context.wallet.getAddress()));

		context.walletIndex.forget(context.wallet.getAddress());
		assert.false(context.walletIndex.has(context.wallet.getAddress()));
	});

	it("forget - should not throw if key is not indexed", (context) => {
		context.walletIndex.forget(context.wallet.getAddress());
	});

	it("forgetWallet - should forget wallet", (context) => {
		context.walletIndex.set(context.wallet.getAddress(), context.wallet);
		assert.equal(context.walletIndex.get(context.wallet.getAddress()), context.wallet);

		context.walletIndex.forgetWallet(context.wallet);
		assert.false(context.walletIndex.has(context.wallet.getAddress()));
	});

	it("forgetWallet - should not throw if wallet is not indexed", (context) => {
		context.walletIndex.forgetWallet(context.wallet);
	});
});
