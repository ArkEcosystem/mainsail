import { Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

import { describe } from "../../../test-framework";
import { setUp } from "../../test/setup";
import { Wallet, WalletRepository } from ".";
import { addressesIndexer, publicKeysIndexer, resignationsIndexer, usernamesIndexer } from "./indexers";
import { WalletHolder } from "./wallet-holder";

describe<{
	walletRepo: WalletRepository;
}>("Wallet Repository", ({ it, assert, afterEach, beforeAll }) => {
	beforeAll(async (context) => {
		const environment = await setUp();

		context.walletRepo = environment.sandbox.app.getTagged(Identifiers.WalletRepository, "state", "blockchain");
	});

	afterEach((context) => {
		context.walletRepo.reset();
	});

	it("#initialize - should throw if indexers are already registered", (context) => {
		assert.throws(() => context.walletRepo.initialize(), "The wallet index is already registered: addresses");
	});

	it("#createWallet - should create a wallet", (context) => {
		const wallet = context.walletRepo.createWallet("abcd");

		assert.equal(wallet.getAddress(), "abcd");
		assert.instance(wallet, Wallet);
	});

	it("#getIndex && #getIndexNames - should be able to look up indexers", (context) => {
		const expected = ["addresses", "publicKeys", "usernames", "resignations"];

		assert.equal(context.walletRepo.getIndexNames(), expected);
		assert.equal(context.walletRepo.getIndex("addresses").indexer, addressesIndexer);
		assert.equal(context.walletRepo.getIndex("publicKeys").indexer, publicKeysIndexer);
		assert.equal(context.walletRepo.getIndex("usernames").indexer, usernamesIndexer);
		assert.equal(context.walletRepo.getIndex("resignations").indexer, resignationsIndexer);
		assert.throws(() => context.walletRepo.getIndex("iDontExist"));
	});

	it("indexing should keep indexers in sync", async (context) => {
		const address = "ATtEq2tqNumWgR9q9zF6FjGp34Mp5JpKGp";
		const wallet = context.walletRepo.createWallet(address);
		const walletHolder = new WalletHolder(wallet);
		const publicKey = "03720586a26d8d49ec27059bd4572c49ba474029c3627715380f4df83fb431aece";
		wallet.setPublicKey(publicKey);

		assert.not.equal(context.walletRepo.findByAddress(address), wallet); // Creates new instance

		context.walletRepo.getIndex("publicKeys").set(publicKey, walletHolder);

		const byPublicKey = await context.walletRepo.findByPublicKey(publicKey);
		assert.defined(byPublicKey.getPublicKey());
		assert.equal(byPublicKey, wallet);

		assert.undefined(context.walletRepo.findByAddress(address).getPublicKey());
		assert.not.equal(context.walletRepo.findByAddress(address), wallet);

		const newWallet = context.walletRepo.findByAddress(address);
		newWallet.setPublicKey(publicKey);
		context.walletRepo.index(newWallet);

		assert.equal(context.walletRepo.findByAddress(address).getPublicKey(), publicKey);
		assert.equal(context.walletRepo.findByAddress(address), wallet);
	});

	it("should get and set wallets by address", (context) => {
		const address = "abcd";
		const wallet = context.walletRepo.createWallet(address);

		assert.false(context.walletRepo.has(address));

		assert.equal(context.walletRepo.findByAddress(address), wallet);
		assert.true(context.walletRepo.has(address));

		assert.equal(context.walletRepo.findByIndex("addresses", address), wallet);
		const nonExistingAddress = "abcde";
		assert.true(context.walletRepo.has(address));
		assert.false(context.walletRepo.has(nonExistingAddress));
		assert.true(context.walletRepo.hasByAddress(address));
		assert.false(context.walletRepo.hasByAddress(nonExistingAddress));
		assert.true(context.walletRepo.hasByIndex("addresses", address));
		assert.false(context.walletRepo.hasByIndex("addresses", nonExistingAddress));
		assert.equal(context.walletRepo.allByAddress(), [wallet]);
		assert.equal(context.walletRepo.allByIndex("addresses"), [wallet]);
	});

	it("should create a wallet if one is not found during address lookup", (context) => {
		assert.not.throws(() => context.walletRepo.findByAddress("hello"));
		assert.instance(context.walletRepo.findByAddress("iDontExist"), Wallet);
		assert.true(context.walletRepo.has("hello"));
		assert.true(context.walletRepo.hasByAddress("iDontExist"));

		const errorMessage = "Wallet iAlsoDontExist doesn't exist in index addresses";
		assert.throws(() => context.walletRepo.findByIndex("addresses", "iAlsoDontExist"), errorMessage);
	});

	it("should get and set wallets by public key", async (context) => {
		const wallet = context.walletRepo.createWallet("abcde");
		const walletHolder = new WalletHolder(wallet);
		const publicKey = "02337416a26d8d49ec27059bd0589c49bb474029c3627715380f4df83fb431aece";
		context.walletRepo.getIndex("publicKeys").set(publicKey, walletHolder);
		assert.equal(await context.walletRepo.findByPublicKey(publicKey), wallet);
		assert.equal(context.walletRepo.findByIndex("publicKeys", publicKey), wallet);

		const nonExistingPublicKey = "98727416a26d8d49ec27059bd0589c49bb474029c3627715380f4df83fb431aece";

		assert.true(context.walletRepo.has(publicKey));
		assert.false(context.walletRepo.has(nonExistingPublicKey));
		assert.true(context.walletRepo.hasByPublicKey(publicKey));
		assert.false(context.walletRepo.hasByPublicKey(nonExistingPublicKey));
		assert.true(context.walletRepo.hasByIndex("publicKeys", publicKey));
		assert.false(context.walletRepo.hasByIndex("publicKeys", nonExistingPublicKey));
		assert.equal(context.walletRepo.allByPublicKey(), [wallet]);
		assert.equal(context.walletRepo.allByIndex("publicKeys"), [wallet]);
	});

	it("should create a wallet if one is not found during public key lookup", async (context) => {
		const firstNotYetExistingPublicKey = "0235d486fea0193cbe77e955ab175b8f6eb9eaf784de689beffbd649989f5d6be3";
		assert.not.throws(() => context.walletRepo.findByPublicKey(firstNotYetExistingPublicKey));
		assert.instance(await context.walletRepo.findByPublicKey(firstNotYetExistingPublicKey), Wallet);

		const secondNotYetExistingPublicKey = "03a46f2547d20b47003c1c376788db5a54d67264df2ae914f70bf453b6a1fa1b3a";
		assert.throws(() => context.walletRepo.findByIndex("publicKeys", secondNotYetExistingPublicKey));
	});

	it("should get and set wallets by username", (context) => {
		const username = "testUsername";
		const wallet = context.walletRepo.createWallet("abcdef");
		const walletHolder = new WalletHolder(wallet);

		context.walletRepo.getIndex("usernames").set(username, walletHolder);
		assert.equal(context.walletRepo.findByUsername(username), wallet);
		assert.equal(context.walletRepo.findByIndex("usernames", username), wallet);

		const nonExistingUsername = "iDontExistAgain";
		assert.true(context.walletRepo.has(username));
		assert.false(context.walletRepo.has(nonExistingUsername));
		assert.true(context.walletRepo.hasByUsername(username));
		assert.false(context.walletRepo.hasByUsername(nonExistingUsername));
		assert.true(context.walletRepo.hasByIndex("usernames", username));
		assert.false(context.walletRepo.hasByIndex("usernames", nonExistingUsername));
		assert.equal(context.walletRepo.allByUsername(), [wallet]);
		assert.equal(context.walletRepo.allByIndex("usernames"), [wallet]);
	});

	it("should be able to index forgotten wallets", (context) => {
		const wallet1 = context.walletRepo.createWallet("wallet1");
		context.walletRepo.index(wallet1);
		assert.true(context.walletRepo.has("wallet1"));
		context.walletRepo.index(wallet1);
		assert.true(context.walletRepo.has("wallet1"));
	});

	it("should do nothing if forgotten wallet does not exist", (context) => {
		const wallet1 = context.walletRepo.createWallet("wallet1");
		context.walletRepo.index(wallet1);
		// @ts-ignore
		wallet1.publicKey = undefined;
		assert.false(context.walletRepo.has("wallet2"));
	});

	it("should get the nonce of a wallet", async (context) => {
		const wallet1 = context.walletRepo.findByAddress("wallet1");
		wallet1.setNonce(BigNumber.make(100));
		wallet1.setPublicKey("02511f16ffb7b7e9afc12f04f317a11d9644e4be9eb5a5f64673946ad0f6336f34");
		context.walletRepo.index(wallet1);

		assert.equal(await context.walletRepo.getNonce(wallet1.getPublicKey()!), BigNumber.make(100));
	});

	it("should return 0 nonce if there is no wallet", async (context) => {
		const publicKey = "03c075494ad044ab8c0b2dc7ccd19f649db844a4e558e539d3ac2610c4b90a5139";
		assert.equal(await context.walletRepo.getNonce(publicKey), BigNumber.ZERO);
	});

	it("should throw when looking up a username which doesn't exist", (context) => {
		assert.throws(
			() => context.walletRepo.findByUsername("iDontExist"),
			"Wallet iDontExist doesn't exist in index usernames",
		);

		assert.throws(
			() => context.walletRepo.findByIndex("usernames", "iDontExist"),
			"Wallet iDontExist doesn't exist in index usernames",
		);
	});

	it("allByIndex - should return values on index", (context) => {
		const wallet = context.walletRepo.findByAddress("address");

		assert.equal(context.walletRepo.allByIndex("addresses"), [wallet]);
	});

	it("setOnIndex - should set wallet on index", (context) => {
		const wallet = context.walletRepo.findByAddress("address");
		context.walletRepo.setOnIndex("addresses", "address2", wallet);

		assert.equal(context.walletRepo.allByIndex("addresses"), [wallet, wallet]);
	});

	it("forgetOnIndex - should forget wallet on index", (context) => {
		const wallet = context.walletRepo.findByAddress("address");
		assert.equal(context.walletRepo.allByIndex("addresses"), [wallet]);

		context.walletRepo.forgetOnIndex("addresses", "address");

		assert.equal(context.walletRepo.allByIndex("addresses"), []);
	});
});
