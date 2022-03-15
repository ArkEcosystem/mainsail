import { Contracts } from "@arkecosystem/core-kernel";
import { describe } from "@arkecosystem/core-test-framework";
import { Utils } from "@arkecosystem/crypto";

import { setUp } from "../../test/setup";
import { Wallet, WalletRepository, WalletRepositoryCopyOnWrite } from "./";
import { addressesIndexer, publicKeysIndexer, resignationsIndexer, usernamesIndexer } from "./indexers";

describe<{
	walletRepoCopyOnWrite: WalletRepositoryCopyOnWrite;
	walletRepo: WalletRepository;
}>("Wallet Repository Copy On Write", ({ it, assert, afterEach, beforeAll, spy }) => {
	beforeAll(async (context) => {
		const env = await setUp();

		context.walletRepoCopyOnWrite = env.walletRepoCopyOnWrite;
		context.walletRepo = env.walletRepo;
	});

	afterEach((context) => {
		context.walletRepoCopyOnWrite.reset();
		context.walletRepo.reset();
	});

	it("should create a wallet", (context) => {
		const wallet = context.walletRepoCopyOnWrite.createWallet("abcd");
		assert.equal(wallet.getAddress(), "abcd");
		assert.instance(wallet, Wallet);
	});

	it("should be able to look up indexers", (context) => {
		const expected = ["addresses", "publicKeys", "usernames", "resignations"];
		assert.equal(context.walletRepoCopyOnWrite.getIndexNames(), expected);
		assert.equal(context.walletRepoCopyOnWrite.getIndex("addresses").indexer, addressesIndexer);
		assert.equal(context.walletRepoCopyOnWrite.getIndex("publicKeys").indexer, publicKeysIndexer);
		assert.equal(context.walletRepoCopyOnWrite.getIndex("usernames").indexer, usernamesIndexer);
		assert.equal(context.walletRepoCopyOnWrite.getIndex("resignations").indexer, resignationsIndexer);
	});

	it("should find wallets by address", (context) => {
		const spyFindByAddress = spy(context.walletRepo, "findByAddress");
		const clonedWallet = context.walletRepoCopyOnWrite.findByAddress("notexisting");

		spyFindByAddress.calledWith("notexisting");

		const originalWallet = context.walletRepo.findByAddress(clonedWallet.getAddress());

		assert.not.equal(originalWallet, clonedWallet);
	});

	it("should get all by username", (context) => {
		const wallet1 = context.walletRepoCopyOnWrite.createWallet("abcd");
		const wallet2 = context.walletRepoCopyOnWrite.createWallet("efg");
		const wallet3 = context.walletRepoCopyOnWrite.createWallet("hij");

		wallet1.setAttribute("delegate.username", "username1");
		wallet2.setAttribute("delegate.username", "username2");
		wallet3.setAttribute("delegate.username", "username3");

		const allWallets = [wallet1, wallet2, wallet3];
		context.walletRepo.index(allWallets);

		assert.true(context.walletRepoCopyOnWrite.allByUsername().some((w) => w.getAddress() === wallet1.getAddress()));
		assert.true(context.walletRepoCopyOnWrite.allByUsername().some((w) => w.getAddress() === wallet2.getAddress()));
		assert.true(context.walletRepoCopyOnWrite.allByUsername().some((w) => w.getAddress() === wallet3.getAddress()));

		const wallet4 = context.walletRepoCopyOnWrite.createWallet("klm");
		wallet4.setAttribute("delegate.username", "username4");

		context.walletRepo.index(wallet4);
		allWallets.push(wallet4);

		assert.true(context.walletRepoCopyOnWrite.allByUsername().some((w) => w.getAddress() === wallet1.getAddress()));
		assert.true(context.walletRepoCopyOnWrite.allByUsername().some((w) => w.getAddress() === wallet2.getAddress()));
		assert.true(context.walletRepoCopyOnWrite.allByUsername().some((w) => w.getAddress() === wallet3.getAddress()));
		assert.true(context.walletRepoCopyOnWrite.allByUsername().some((w) => w.getAddress() === wallet4.getAddress()));
	});

	// TODO: test behaves differently to WalletRepository due to inheritance
	it.skip("findByPublicKey should index wallet", (context) => {
		const address = "ATtEq2tqNumWgR9q9zF6FjGp34Mp5JpKGp";
		const wallet = context.walletRepoCopyOnWrite.createWallet(address);
		const publicKey = "03720586a26d8d49ec27059bd4572c49ba474029c3627715380f4df83fb431aece";
		wallet.setPublicKey(publicKey);

		assert.not.equal(context.walletRepoCopyOnWrite.findByAddress(address), wallet);
		context.walletRepoCopyOnWrite.getIndex("publicKeys").set(publicKey, wallet);
		assert.defined(context.walletRepoCopyOnWrite.findByPublicKey(publicKey).getPublicKey());
		assert.equal(context.walletRepoCopyOnWrite.findByPublicKey(publicKey), wallet);

		assert.defined(context.walletRepoCopyOnWrite.findByAddress(address).getPublicKey());
		assert.equal(context.walletRepoCopyOnWrite.findByAddress(address), wallet);
	});

	// TODO: test behaves differently to WalletRepository due to inheritance
	it.skip("should not retrieve wallets indexed in original repo, until they are indexed", (context) => {
		const address = "abcd";

		const wallet = context.walletRepoCopyOnWrite.createWallet(address);
		context.walletRepoCopyOnWrite.index(wallet);

		assert.false(context.walletRepoCopyOnWrite.has(address));
		assert.false(context.walletRepoCopyOnWrite.hasByAddress(address));
		assert.false(context.walletRepoCopyOnWrite.hasByIndex("addresses", address));

		assert.equal(context.walletRepoCopyOnWrite.allByAddress(), [wallet]);

		context.walletRepo.index(wallet);

		assert.true(context.walletRepoCopyOnWrite.has(address));
		assert.true(context.walletRepoCopyOnWrite.hasByAddress(address));
		assert.true(context.walletRepoCopyOnWrite.hasByIndex("addresses", address));
		assert.equal(context.walletRepoCopyOnWrite.allByAddress(), [wallet]);

		// TODO: similarly, this behaviour is odd - as the code hasn't been overwritten in the extended class
		assert.true(context.walletRepoCopyOnWrite.has(address));
	});

	// TODO: test behaves differently to WalletRepository due to i
	it.skip("should create a wallet if one is not found during address lookup", (context) => {
		assert.not.throws(() => context.walletRepoCopyOnWrite.findByAddress("hello"));
		assert.instance(context.walletRepoCopyOnWrite.findByAddress("iDontExist"), Wallet);
		assert.false(context.walletRepoCopyOnWrite.has("hello"));
		assert.false(context.walletRepoCopyOnWrite.hasByAddress("iDontExist"));

		assert.not.throws(() => context.walletRepoCopyOnWrite.findByIndex("addresses", "iAlsoDontExist"));
	});

	// TODO: test behaves differently to WalletRepository due to inheritance
	it.skip("index - should not affect the original", (context) => {
		const wallet = context.walletRepo.createWallet("abcdef");
		context.walletRepo.index(wallet);

		context.walletRepoCopyOnWrite.index(wallet);

		assert.not.equal(
			context.walletRepo.findByAddress(wallet.getAddress()),
			context.walletRepoCopyOnWrite.findByAddress(wallet.getAddress()),
		);
	});

	it("findByAddress - should return a copy", (context) => {
		const wallet = context.walletRepo.createWallet("abcdef");
		context.walletRepo.index(wallet);

		const tempWallet = context.walletRepoCopyOnWrite.findByAddress(wallet.getAddress());
		tempWallet.setBalance(Utils.BigNumber.ONE);

		assert.not.equal(wallet.getBalance(), tempWallet.getBalance());
	});

	it("findByPublicKey - should return a copy", (context) => {
		const wallet = context.walletRepo.createWallet("ATtEq2tqNumWgR9q9zF6FjGp34Mp5JpKGp");
		wallet.setPublicKey("03720586a26d8d49ec27059bd4572c49ba474029c3627715380f4df83fb431aece");
		wallet.setBalance(Utils.BigNumber.SATOSHI);
		context.walletRepo.index(wallet);

		const tempWallet = context.walletRepoCopyOnWrite.findByPublicKey(wallet.getPublicKey()!);
		tempWallet.setBalance(Utils.BigNumber.ZERO);

		assert.equal(wallet.getBalance(), Utils.BigNumber.SATOSHI);
		assert.equal(tempWallet.getBalance(), Utils.BigNumber.ZERO);
	});

	it("findByUsername - should return a copy", (context) => {
		const wallet = context.walletRepo.createWallet("abcdef");
		wallet.setAttribute("delegate", { username: "test" });
		context.walletRepo.index(wallet);

		const tempWallet = context.walletRepoCopyOnWrite.findByUsername(wallet.getAttribute("delegate.username"));
		tempWallet.setBalance(Utils.BigNumber.ONE);

		assert.not.equal(wallet.getBalance(), tempWallet.getBalance());
	});

	it("hasByAddress - should be ok", (context) => {
		const wallet = context.walletRepo.createWallet("abcdef");
		context.walletRepo.index(wallet);

		assert.true(context.walletRepoCopyOnWrite.hasByAddress(wallet.getAddress()));
	});

	it("hasByPublicKey - should be ok", (context) => {
		const wallet = context.walletRepo.createWallet("ATtEq2tqNumWgR9q9zF6FjGp34Mp5JpKGp");
		wallet.setPublicKey("03720586a26d8d49ec27059bd4572c49ba474029c3627715380f4df83fb431aece");
		context.walletRepo.index(wallet);

		assert.true(context.walletRepoCopyOnWrite.hasByPublicKey(wallet.getPublicKey()!));
	});

	it("hasByUsername - should be ok", (context) => {
		const wallet = context.walletRepo.createWallet("abcdef");
		wallet.setAttribute("delegate", { username: "test" });
		context.walletRepo.index(wallet);

		assert.true(context.walletRepoCopyOnWrite.hasByUsername(wallet.getAttribute("delegate.username")));
	});

	it("hasByIndex - should be ok", (context) => {
		const wallet = context.walletRepo.createWallet("abc");
		wallet.setAttribute("delegate", { username: "test" });
		context.walletRepo.index(wallet);

		assert.true(context.walletRepoCopyOnWrite.hasByIndex(Contracts.State.WalletIndexes.Usernames, "test"));
	});

	it("findByIndex - should be ok", (context) => {
		const wallet = context.walletRepo.createWallet("abc");
		wallet.setAttribute("delegate", { username: "test" });
		context.walletRepo.index(wallet);
		const clone = context.walletRepoCopyOnWrite.findByIndex(Contracts.State.WalletIndexes.Usernames, "test");

		assert.not.equal(clone, wallet);
		assert.equal(clone.getAddress(), wallet.getAddress());
		assert.equal(clone.getAttribute("delegate.username"), wallet.getAttribute("delegate.username"));
	});
});
