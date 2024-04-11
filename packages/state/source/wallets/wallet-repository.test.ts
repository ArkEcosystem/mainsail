import { Identifiers } from "@mainsail/contracts";

import { describeSkip } from "../../../test-framework/source";
import { setUp } from "../../test/setup";
import { Wallet, WalletIndex, WalletRepository } from ".";

describeSkip<{
	walletRepo: WalletRepository;
}>("Wallet Repository", ({ it, assert, afterEach, beforeEach }) => {
	beforeEach(async (context) => {
		const environment = await setUp();

		context.walletRepo = environment.sandbox.app.getTagged(Identifiers.WalletRepository, "state", "blockchain");
	});

	it("#findByAddress - should create a wallet", ({ walletRepo }) => {
		const wallet = walletRepo.findByAddress("abcd");

		assert.equal(wallet.getAddress(), "abcd");
		assert.instance(wallet, Wallet);
	});

	it("#getIndex && #getIndexNames - should be able to look up indexers", ({ walletRepo }) => {
		assert.instance(walletRepo.getIndex("addresses"), WalletIndex);
		assert.instance(walletRepo.getIndex("publicKeys"), WalletIndex);
		assert.instance(walletRepo.getIndex("usernames"), WalletIndex);
		assert.instance(walletRepo.getIndex("resignations"), WalletIndex);
		assert.throws(() => walletRepo.getIndex("iDontExist"));
	});

	it("should get and set wallets by address", ({ walletRepo }) => {
		const address = "abcd";
		const wallet = walletRepo.findByAddress(address);

		assert.equal(walletRepo.findByAddress(address), wallet);
		assert.true(walletRepo.hasByAddress(address));

		assert.equal(walletRepo.findByIndex("addresses", address), wallet);
		const nonExistingAddress = "abcde";
		assert.true(walletRepo.hasByAddress(address));
		assert.false(walletRepo.hasByAddress(nonExistingAddress));
		assert.true(walletRepo.hasByIndex("addresses", address));
		assert.false(walletRepo.hasByIndex("addresses", nonExistingAddress));
		assert.equal(walletRepo.allByAddress(), [wallet]);
		assert.equal(walletRepo.allByIndex("addresses"), [wallet]);
	});

	it("should create a wallet if one is not found during address lookup", ({ walletRepo }) => {
		assert.not.throws(() => walletRepo.findByAddress("hello"));
		assert.true(walletRepo.hasByAddress("hello"));
		assert.instance(walletRepo.findByAddress("iDontExist"), Wallet);
		assert.true(walletRepo.hasByAddress("iDontExist"));

		const errorMessage = "Wallet iAlsoDontExist doesn't exist on index addresses";
		assert.throws(() => walletRepo.findByIndex("addresses", "iAlsoDontExist"), errorMessage);
	});

	it("should get and set wallets by public key", async ({ walletRepo }) => {
		const wallet = walletRepo.findByAddress("abcde");
		const publicKey = "02337416a26d8d49ec27059bd0589c49bb474029c3627715380f4df83fb431aece";
		walletRepo.getIndex("publicKeys").set(publicKey, wallet);
		assert.equal(await walletRepo.findByPublicKey(publicKey), wallet);
		assert.equal(walletRepo.findByIndex("publicKeys", publicKey), wallet);

		const nonExistingPublicKey = "98727416a26d8d49ec27059bd0589c49bb474029c3627715380f4df83fb431aece";

		assert.true(walletRepo.hasByPublicKey(publicKey));
		assert.false(walletRepo.hasByPublicKey(nonExistingPublicKey));
		assert.true(walletRepo.hasByIndex("publicKeys", publicKey));
		assert.false(walletRepo.hasByIndex("publicKeys", nonExistingPublicKey));
		assert.equal(walletRepo.allByPublicKey(), [wallet]);
		assert.equal(walletRepo.allByIndex("publicKeys"), [wallet]);
	});

	it("should create a wallet if one is not found during public key lookup", async ({ walletRepo }) => {
		const firstNotYetExistingPublicKey = "0235d486fea0193cbe77e955ab175b8f6eb9eaf784de689beffbd649989f5d6be3";
		assert.not.throws(() => walletRepo.findByPublicKey(firstNotYetExistingPublicKey));
		assert.instance(await walletRepo.findByPublicKey(firstNotYetExistingPublicKey), Wallet);

		const secondNotYetExistingPublicKey = "03a46f2547d20b47003c1c376788db5a54d67264df2ae914f70bf453b6a1fa1b3a";
		assert.throws(() => walletRepo.findByIndex("publicKeys", secondNotYetExistingPublicKey));
	});

	it("should get and set wallets by username", ({ walletRepo }) => {
		const username = "testUsername";
		const wallet = walletRepo.findByAddress("abcdef");

		walletRepo.getIndex("usernames").set(username, wallet);
		assert.equal(walletRepo.findByUsername(username), wallet);
		assert.equal(walletRepo.findByIndex("usernames", username), wallet);

		const nonExistingUsername = "iDontExistAgain";
		assert.true(walletRepo.hasByUsername(username));
		assert.false(walletRepo.hasByUsername(nonExistingUsername));
		assert.true(walletRepo.hasByIndex("usernames", username));
		assert.false(walletRepo.hasByIndex("usernames", nonExistingUsername));
		assert.equal(walletRepo.allByUsername(), [wallet]);
		assert.equal(walletRepo.allByIndex("usernames"), [wallet]);
	});

	it("should throw when looking up a username which doesn't exist", ({ walletRepo }) => {
		assert.throws(
			() => walletRepo.findByUsername("iDontExist"),
			"Wallet iDontExist doesn't exist on index usernames",
		);

		assert.throws(
			() => walletRepo.findByIndex("usernames", "iDontExist"),
			"Wallet iDontExist doesn't exist on index usernames",
		);
	});

	it("#allByIndex - should return values on index", ({ walletRepo }) => {
		const wallet = walletRepo.findByAddress("address");

		assert.equal(walletRepo.allByIndex("addresses"), [wallet]);
	});

	it("#setOnIndex - should set wallet on index", ({ walletRepo }) => {
		const wallet = walletRepo.findByAddress("address");
		walletRepo.setOnIndex("addresses", "address2", wallet);

		assert.equal(walletRepo.allByIndex("addresses"), [wallet, wallet]);
	});

	it("#forgetOnIndex - should forget wallet on index", ({ walletRepo }) => {
		const wallet = walletRepo.findByAddress("address");
		assert.equal(walletRepo.allByIndex("addresses"), [wallet]);

		walletRepo.forgetOnIndex("addresses", "address");

		assert.equal(walletRepo.allByIndex("addresses"), []);
	});
});
