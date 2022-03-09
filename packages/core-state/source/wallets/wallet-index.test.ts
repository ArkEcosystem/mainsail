import { Wallets } from "../";
import { WalletIndex } from "./";
import { setUp } from "../../test/setup";
import { describe, Factories } from "@arkecosystem/core-test-framework";

describe<{
	factory: Factories.FactoryBuilder;
	wallet: Wallets.Wallet;
	walletIndex: WalletIndex;
}>("WalletIndex", ({ it, beforeAll, beforeEach, assert }) => {
	beforeAll(async (context) => {
		const env = await setUp();

		context.factory = env.factory;
	});

	beforeEach((context) => {
		context.wallet = context.factory.get("Wallet").make<Wallets.Wallet>();

		context.walletIndex = new WalletIndex((index, wallet) => {
			index.set(wallet.getAddress(), wallet);
		}, true);
	});

	it("should return entries", (context) => {
		context.walletIndex.index(context.wallet);
		const entries = context.walletIndex.entries();

		assert.equal(entries.length, 1);
		assert.equal(entries[0][0], entries[0][1].getAddress());
		assert.equal(entries[0][0], context.wallet.getAddress());
	});

	it("should return keys", (context) => {
		context.walletIndex.index(context.wallet);

		assert.true(context.walletIndex.keys().includes(context.wallet.getAddress()));
	});

	it("should return walletKeys", (context) => {
		assert.equal(context.walletIndex.walletKeys(context.wallet), []);

		context.walletIndex.index(context.wallet);

		assert.equal(context.walletIndex.walletKeys(context.wallet), [context.wallet.getAddress()]);
	});

	it("set - should set and get addresses", (context) => {
		assert.false(context.walletIndex.has(context.wallet.getAddress()));

		context.walletIndex.index(context.wallet);
		context.walletIndex.set(context.wallet.getAddress(), context.wallet);

		assert.equal(context.walletIndex.get(context.wallet.getAddress()), context.wallet);
		assert.true(context.walletIndex.has(context.wallet.getAddress()));

		assert.true(context.walletIndex.values().includes(context.wallet));

		context.walletIndex.clear();
		assert.false(context.walletIndex.has(context.wallet.getAddress()));
	});

	it("set - should override key with new wallet", (context) => {
		const anotherWallet = context.factory.get("Wallet").make<Wallets.Wallet>();

		context.walletIndex.set("key1", context.wallet);
		context.walletIndex.set("key1", anotherWallet);

		assert.equal(context.walletIndex.get("key1"), anotherWallet);

		const entries = context.walletIndex.entries();

		assert.equal(entries.length, 1);
	});

	it("forget - should index and forget wallets", (context) => {
		assert.false(context.walletIndex.has(context.wallet.getAddress()));

		context.walletIndex.index(context.wallet);
		assert.true(context.walletIndex.has(context.wallet.getAddress()));

		context.walletIndex.forget(context.wallet.getAddress());
		assert.false(context.walletIndex.has(context.wallet.getAddress()));
	});

	it("forget - should not throw if key is not indexed", (context) => {
		context.walletIndex.forget(context.wallet.getAddress());
	});

	it("forgetWallet - should forget wallet", (context) => {
		context.walletIndex.index(context.wallet);
		assert.equal(context.walletIndex.get(context.wallet.getAddress()), context.wallet);

		context.walletIndex.forgetWallet(context.wallet);
		assert.undefined(context.walletIndex.get(context.wallet.getAddress()));
	});

	it("forgetWallet - should not throw if wallet is not indexed", (context) => {
		context.walletIndex.forgetWallet(context.wallet);
	});
});
