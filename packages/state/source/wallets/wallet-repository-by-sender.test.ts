import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

import { describeSkip } from "../../../test-framework/source";
import { setUp } from "../../test/setup";
import { Wallet, WalletRepository, WalletRepositoryCopyOnWrite } from ".";

describeSkip<{
	walletRepoCopyOnWrite: WalletRepositoryCopyOnWrite;
	walletRepo: WalletRepository;
}>("Wallet Repository Copy On Write", ({ it, assert, afterEach, beforeAll, spy }) => {
	beforeAll(async (context) => {
		const environment = await setUp();

		context.walletRepoCopyOnWrite = environment.walletRepoCopyOnWrite;
		context.walletRepo = environment.walletRepo;
	});

	afterEach((context) => {
		context.walletRepoCopyOnWrite.reset();
		context.walletRepo.reset();
	});

	it("should create a wallet", (context) => {
		const wallet = context.walletRepoCopyOnWrite.findByAddress("abcd");
		assert.equal(wallet.getAddress(), "abcd");
		assert.instance(wallet, Wallet);
	});

	it("should be able to look up indexers", (context) => {
		const expected = ["addresses", "publicKeys", "usernames", "resignations"];
		assert.equal(context.walletRepoCopyOnWrite.getIndexNames(), expected);
	});

	it("should find wallets by address", (context) => {
		const spyFindByAddress = spy(context.walletRepo, "findByAddress");
		const clonedWallet = context.walletRepoCopyOnWrite.findByAddress("notexisting");

		spyFindByAddress.calledWith("notexisting");

		const originalWallet = context.walletRepo.findByAddress(clonedWallet.getAddress());

		assert.not.equal(originalWallet, clonedWallet);
	});

	it("should get all by username", (context) => {
		const wallet1 = context.walletRepo.findByAddress("abcd");
		const wallet2 = context.walletRepo.findByAddress("efg");
		const wallet3 = context.walletRepo.findByAddress("hij");

		wallet1.setAttribute("validatorUsername", "username1");
		wallet2.setAttribute("validatorUsername", "username2");
		wallet3.setAttribute("validatorUsername", "username3");

		context.walletRepo.setOnIndex(Contracts.State.WalletIndexes.Usernames, "username1", wallet1);
		context.walletRepo.setOnIndex(Contracts.State.WalletIndexes.Usernames, "username2", wallet2);
		context.walletRepo.setOnIndex(Contracts.State.WalletIndexes.Usernames, "username3", wallet3);

		assert.true(context.walletRepoCopyOnWrite.allByUsername().some((w) => w.getAddress() === wallet1.getAddress()));
		assert.true(context.walletRepoCopyOnWrite.allByUsername().some((w) => w.getAddress() === wallet2.getAddress()));
		assert.true(context.walletRepoCopyOnWrite.allByUsername().some((w) => w.getAddress() === wallet3.getAddress()));

		const wallet4 = context.walletRepoCopyOnWrite.findByAddress("klm");
		wallet4.setAttribute("validatorUsername", "username4");
		context.walletRepoCopyOnWrite.setOnIndex(Contracts.State.WalletIndexes.Usernames, "username4", wallet4);

		assert.true(context.walletRepoCopyOnWrite.allByUsername().some((w) => w.getAddress() === wallet1.getAddress()));
		assert.true(context.walletRepoCopyOnWrite.allByUsername().some((w) => w.getAddress() === wallet2.getAddress()));
		assert.true(context.walletRepoCopyOnWrite.allByUsername().some((w) => w.getAddress() === wallet3.getAddress()));
		assert.true(context.walletRepoCopyOnWrite.allByUsername().some((w) => w.getAddress() === wallet4.getAddress()));
	});

	// TODO: test behaves differently to WalletRepository due to inheritance
	it.skip("findByPublicKey should index wallet", async (context) => {
		const address = "ATtEq2tqNumWgR9q9zF6FjGp34Mp5JpKGp";
		const wallet = context.walletRepoCopyOnWrite.findByAddress(address);
		const publicKey = "03720586a26d8d49ec27059bd4572c49ba474029c3627715380f4df83fb431aece";
		wallet.setPublicKey(publicKey);

		assert.not.equal(context.walletRepoCopyOnWrite.findByAddress(address), wallet);
		context.walletRepoCopyOnWrite.getIndex("publicKeys").set(publicKey, wallet);
		const byPublicKey = await context.walletRepoCopyOnWrite.findByPublicKey(publicKey);
		assert.defined(byPublicKey.getPublicKey());
		assert.equal(byPublicKey, wallet);

		assert.defined(context.walletRepoCopyOnWrite.findByAddress(address).getPublicKey());
		assert.equal(context.walletRepoCopyOnWrite.findByAddress(address), wallet);
	});

	// TODO: test behaves differently to WalletRepository due to inheritance
	it.skip("should not retrieve wallets indexed in original repo, until they are indexed", (context) => {
		const address = "abcd";

		const wallet = context.walletRepoCopyOnWrite.findByAddress(address);
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
		const wallet = context.walletRepo.findByAddress("abcdef");
		context.walletRepo.index(wallet);

		context.walletRepoCopyOnWrite.index(wallet);

		assert.not.equal(
			context.walletRepo.findByAddress(wallet.getAddress()),
			context.walletRepoCopyOnWrite.findByAddress(wallet.getAddress()),
		);
	});

	it("findByAddress - should return a copy", (context) => {
		const wallet = context.walletRepo.findByAddress("abcdef");
		context.walletRepo.index(wallet);

		const temporaryWallet = context.walletRepoCopyOnWrite.findByAddress(wallet.getAddress());
		temporaryWallet.setBalance(BigNumber.ONE);

		assert.not.equal(wallet.getBalance(), temporaryWallet.getBalance());
	});

	it("findByPublicKey - should return a copy", async (context) => {
		const wallet = context.walletRepo.findByAddress("ATtEq2tqNumWgR9q9zF6FjGp34Mp5JpKGp");
		wallet.setPublicKey("03720586a26d8d49ec27059bd4572c49ba474029c3627715380f4df83fb431aece");
		wallet.setBalance(BigNumber.WEI);
		context.walletRepo.index(wallet);

		const temporaryWallet = await context.walletRepoCopyOnWrite.findByPublicKey(wallet.getPublicKey()!);
		temporaryWallet.setBalance(BigNumber.ZERO);

		assert.equal(wallet.getBalance(), BigNumber.WEI);
		assert.equal(temporaryWallet.getBalance(), BigNumber.ZERO);
	});

	it.skip("findByUsername - should return a copy", (context) => {
		const wallet = context.walletRepo.findByAddress("abcdef");
		wallet.setAttribute("validatorUsername", "test");
		context.walletRepo.index(wallet);

		const temporaryWallet = context.walletRepoCopyOnWrite.findByUsername(wallet.getAttribute("validatorUsername"));
		temporaryWallet.setBalance(BigNumber.ONE);

		assert.not.equal(wallet.getBalance(), temporaryWallet.getBalance());
	});

	it("hasByAddress - should be ok", (context) => {
		const wallet = context.walletRepo.findByAddress("abcdef");
		context.walletRepo.index(wallet);

		assert.true(context.walletRepoCopyOnWrite.hasByAddress(wallet.getAddress()));
	});

	it.skip("hasByPublicKey - should be ok", (context) => {
		const wallet = context.walletRepo.findByAddress("ATtEq2tqNumWgR9q9zF6FjGp34Mp5JpKGp");
		wallet.setPublicKey("03720586a26d8d49ec27059bd4572c49ba474029c3627715380f4df83fb431aece");
		context.walletRepo.index(wallet);

		assert.true(context.walletRepoCopyOnWrite.hasByPublicKey(wallet.getPublicKey()!));
	});

	it.skip("hasByUsername - should be ok", (context) => {
		const wallet = context.walletRepo.findByAddress("abcdef");
		wallet.setAttribute("validator", { username: "test" });
		context.walletRepo.index(wallet);

		assert.true(context.walletRepoCopyOnWrite.hasByUsername(wallet.getAttribute("validatorUsername")));
	});

	it.skip("hasByIndex - should be ok", (context) => {
		const wallet = context.walletRepo.findByAddress("abc");
		wallet.setAttribute("validator", { username: "test" });
		context.walletRepo.index(wallet);

		assert.true(context.walletRepoCopyOnWrite.hasByIndex(Contracts.State.WalletIndexes.Usernames, "test"));
	});

	it.skip("findByIndex - should be ok", (context) => {
		const wallet = context.walletRepo.findByAddress("abc");
		wallet.setAttribute("validator", { username: "test" });
		context.walletRepo.index(wallet);
		const clone = context.walletRepoCopyOnWrite.findByIndex(Contracts.State.WalletIndexes.Usernames, "test");

		assert.not.equal(clone, wallet);
		assert.equal(clone.getAddress(), wallet.getAddress());
		assert.equal(clone.getAttribute("validatorUsername"), wallet.getAttribute("validatorUsername"));
	});
});
