import { Selectors } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services } from "@mainsail/kernel";

import { AddressFactory } from "../../../crypto-address-base58/source/address.factory";
import { Configuration } from "../../../crypto-config";
import { KeyPairFactory } from "../../../crypto-key-pair-schnorr/source/pair";
import { PublicKeyFactory } from "../../../crypto-key-pair-schnorr/source/public";
import { describe, Sandbox } from "../../../test-framework";
import {
	addressesIndexer,
	publicKeysIndexer,
	usernamesIndexer,
	Wallet,
	WalletRepository,
	WalletRepositoryClone,
} from ".";
import { walletFactory } from "./factory";

describe<{
	walletRepositoryBlockchain: WalletRepository;
	walletRepositoryClone: WalletRepositoryClone;
	publicKey: string;
	username: string;
}>("Wallet Repository Clone", ({ it, assert, beforeEach, spy }) => {
	beforeEach((context) => {
		context.publicKey = "03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37";
		context.username = "genesis_1";

		const sandbox = new Sandbox();
		const app = sandbox.app;

		app.bind(Identifiers.WalletAttributes).to(Services.Attributes.AttributeSet).inSingletonScope();

		app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validatorUsername");

		app.bind(Identifiers.Cryptography.Identity.AddressFactory).to(AddressFactory).inSingletonScope();
		app.bind(Identifiers.Cryptography.Identity.KeyPairFactory).to(KeyPairFactory).inSingletonScope();
		app.bind(Identifiers.Cryptography.Identity.PublicKeyFactory).to(PublicKeyFactory).inSingletonScope();
		app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		const configuration = app.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration);
		configuration.setConfig({
			milestones: [
				{
					address: {
						base58: 23,
					},
				},
			],
		} as any);

		app.bind(Identifiers.WalletRepositoryIndexerIndex).toConstantValue({
			autoIndex: true,
			indexer: addressesIndexer,
			name: Contracts.State.WalletIndexes.Addresses,
		});

		app.bind(Identifiers.WalletRepositoryIndexerIndex).toConstantValue({
			autoIndex: true,
			indexer: publicKeysIndexer,
			name: Contracts.State.WalletIndexes.PublicKeys,
		});

		app.bind(Identifiers.WalletRepositoryIndexerIndex).toConstantValue({
			autoIndex: true,
			indexer: usernamesIndexer,
			name: Contracts.State.WalletIndexes.Usernames,
		});

		app.bind(Identifiers.WalletFactory)
			.toFactory(({ container }) => walletFactory(container.get(Identifiers.WalletAttributes)))
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "blockchain"));

		app.bind(Identifiers.WalletFactory)
			.toFactory(({ container }) => walletFactory(container.get(Identifiers.WalletAttributes)))
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "clone"));

		app.bind(Identifiers.WalletRepository)
			.to(WalletRepository)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "blockchain"));

		app.bind(Identifiers.WalletRepository)
			.to(WalletRepositoryClone)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "clone"));

		context.walletRepositoryBlockchain = app.getTagged<WalletRepositoryClone>(
			Identifiers.WalletRepository,
			"state",
			"blockchain",
		);

		context.walletRepositoryClone = app.getTagged<WalletRepositoryClone>(
			Identifiers.WalletRepository,
			"state",
			"clone",
		);
	});

	it("initialize - should throw if wallet index is already registered", (context) => {
		assert.throws(() => {
			context.walletRepositoryClone.initialize();
		});
	});

	it("#findByAddress - should create wallet by address", async (context) => {
		const wallet = context.walletRepositoryClone.findByAddress("address");

		assert.instance(wallet, Wallet);
		assert.equal(wallet.getAddress(), "address");
	});

	it("getIndex - should return wallet repository clone index", async (context) => {
		context.walletRepositoryBlockchain.findByAddress("address_1");
		const wallet = context.walletRepositoryClone.findByAddress("address_2");

		const values = context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).values();

		assert.equal(
			values.map((WalletHolder) => WalletHolder.getWallet()),
			[wallet],
		);
	});

	it("getIndexNames - should return index names", (context) => {
		assert.equal(context.walletRepositoryClone.getIndexNames(), ["addresses", "publicKeys", "usernames"]);
	});

	it("index - should index single wallet if there are no changes in indexes", async (context) => {
		const wallet = context.walletRepositoryClone.findByAddress("address");

		context.walletRepositoryClone.index(wallet);
	});

	it("index - should index single wallet if wallet change results in set on index", async (context) => {
		const wallet = context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validatorUsername", "genesis_1");

		assert.false(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("genesis_1"));

		context.walletRepositoryClone.index(wallet);

		assert.true(wallet === context.walletRepositoryClone.findByAddress("address"));
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("genesis_1"));
	});

	it("index - should index single wallet if wallet change results in forget on index", async (context) => {
		const wallet = context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryClone.index(wallet);
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("genesis_1"));

		wallet.forgetAttribute("validatorUsername");
		context.walletRepositoryClone.index(wallet);

		assert.false(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("genesis_1"));
	});

	it("index - should index wallet array", (context) => {
		const wallet1 = context.walletRepositoryClone.findByAddress("address_1");
		const wallet2 = context.walletRepositoryClone.findByAddress("address_2");

		context.walletRepositoryClone.index([wallet1, wallet2]);
	});

	it("forgetOnIndex - should clone wallet and set key on forget index if key exists only on blockchain wallet repository", (context) => {
		const blockchainWallet = context.walletRepositoryBlockchain.findByAddress("address");
		blockchainWallet.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryBlockchain.index(blockchainWallet);

		context.walletRepositoryClone.forgetOnIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1");

		assert.false(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("genesis_1"));
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).has("address"));
	});

	it("forgetOnIndex - should set key on forget index if key exists on wallet repository clone", async (context) => {
		const wallet = context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryClone.index(wallet);

		assert.true(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));

		context.walletRepositoryClone.forgetOnIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1");

		assert.false(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("genesis_1"));
		assert.false(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));
	});

	it("findByAddress - should copy and index wallet from blockchain wallet repository if exist in blockchain wallet repository", async (context) => {
		const blockchainWallet = context.walletRepositoryBlockchain.findByAddress("address");
		assert.true(context.walletRepositoryBlockchain.hasByAddress("address"));
		blockchainWallet.setAttribute("validatorUsername", "username");
		context.walletRepositoryBlockchain.index(blockchainWallet);

		assert.true(
			context.walletRepositoryBlockchain.getIndex(Contracts.State.WalletIndexes.Usernames).has("username"),
		);

		const wallet = context.walletRepositoryClone.findByAddress("address");

		assert.equal(wallet, blockchainWallet);
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).has("address"));
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("username"));
	});

	it("findByAddress - should create and index new wallet if does not exist in blockchain wallet repository", async (context) => {
		const wallet = context.walletRepositoryClone.findByAddress("address");

		assert.instance(wallet, Wallet);
		assert.equal(wallet.getAddress(), "address");
		assert.true(context.walletRepositoryClone.hasByAddress("address"));
		assert.false(context.walletRepositoryBlockchain.hasByAddress("address"));
	});

	it("findByAddress - should return existing wallet", (context) => {
		const wallet = context.walletRepositoryClone.findByAddress("address");

		assert.instance(wallet, Wallet);
		assert.equal(wallet.getAddress(), "address");
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).has("address"));

		const existingWallet = context.walletRepositoryClone.findByAddress("address");

		assert.equal(wallet, existingWallet);
		assert.false(context.walletRepositoryBlockchain.hasByAddress("address"));
	});

	it("findByPublicKey - should copy and index wallet from blockchain wallet repository if exist in blockchain wallet repository", async (context) => {
		const blockchainWallet = await context.walletRepositoryBlockchain.findByPublicKey(context.publicKey);
		blockchainWallet.setAttribute("validatorUsername", "username");
		context.walletRepositoryBlockchain.index(blockchainWallet);

		const wallet = await context.walletRepositoryClone.findByPublicKey(context.publicKey);

		assert.instance(wallet, Wallet);
		assert.equal(wallet.getPublicKey(), context.publicKey);
		assert.true(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.PublicKeys).has(context.publicKey),
		);
		assert.true(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).has(wallet.getAddress()),
		);
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("username"));

		assert.equal(wallet, blockchainWallet);
	});

	it("findByPublicKey - should create and index new wallet if does not exist in blockchain wallet repository", async (context) => {
		const wallet = await context.walletRepositoryClone.findByPublicKey(context.publicKey);

		assert.instance(wallet, Wallet);
		assert.equal(wallet.getPublicKey(), context.publicKey);
		assert.true(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.PublicKeys).has(context.publicKey),
		);
		assert.true(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).has(wallet.getAddress()),
		);

		assert.false(context.walletRepositoryBlockchain.hasByPublicKey(context.publicKey));
		assert.false(context.walletRepositoryBlockchain.hasByAddress(wallet.getAddress()));
	});

	it("findByPublicKey - should return existing wallet", async (context) => {
		const wallet = await context.walletRepositoryClone.findByPublicKey(context.publicKey);

		assert.instance(wallet, Wallet);
		assert.equal(wallet.getPublicKey(), context.publicKey);
		assert.true(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.PublicKeys).has(context.publicKey),
		);
		const existingWallet = await context.walletRepositoryClone.findByPublicKey(context.publicKey);

		assert.equal(wallet, existingWallet);
		assert.false(context.walletRepositoryBlockchain.hasByPublicKey(context.publicKey));
	});

	it("findByUsername - should copy and index wallet from blockchain wallet repository if exist in blockchain wallet repository", async (context) => {
		const blockchainWallet = context.walletRepositoryBlockchain.findByAddress("address");
		blockchainWallet.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryBlockchain.index(blockchainWallet);
		assert.true(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));

		const wallet = context.walletRepositoryClone.findByUsername("genesis_1");

		assert.equal(wallet, blockchainWallet);
		assert.equal(wallet.getAttribute("validatorUsername"), "genesis_1");
		assert.true(context.walletRepositoryClone.hasByUsername("genesis_1"));
	});

	it("findByUsername - should return existing wallet", async (context) => {
		const wallet = context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryClone.index(wallet);

		const existingWallet = context.walletRepositoryClone.findByUsername("genesis_1");
		assert.equal(wallet, existingWallet);
	});

	it("findByUsername - should throw error if wallet does not exist in blockchain or copy wallet repository", (context) => {
		assert.throws(() => {
			context.walletRepositoryClone.findByUsername("genesis_1");
		}, "Wallet genesis_1 doesn't exist in index usernames");
	});

	it("findByIndexes - should copy and index wallet from blockchain wallet repository if key exist in blockchain wallet repository", (context) => {
		const blockchainWallet = context.walletRepositoryBlockchain.findByAddress("address");

		assert.equal(context.walletRepositoryBlockchain.findByIndexes(["addresses"], "address"), blockchainWallet);
		assert.false(context.walletRepositoryClone.findByIndexes(["addresses"], "address") === blockchainWallet);

		const wallet = context.walletRepositoryClone.findByIndexes(["addresses"], "address");
		assert.equal(wallet, blockchainWallet);
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).has("address"));
	});

	it("findByIndexes - should return wallet from wallet repository clone", async (context) => {
		const wallet = context.walletRepositoryClone.findByAddress("address");

		assert.equal(context.walletRepositoryClone.findByIndexes(["addresses"], "address"), wallet);
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).has("address"));
	});

	it("findByIndexes - should throw error if wallet does not exist in blockchain or copy wallet repository", (context) => {
		assert.throws(() => {
			context.walletRepositoryClone.findByIndexes(["addresses"], "address");
		}, "Wallet address doesn't exist in indexes addresses");
	});

	it("findByIndex - should copy and index wallet from blockchain wallet repository if exist in blockchain wallet repository", async (context) => {
		const blockchainWallet = context.walletRepositoryBlockchain.findByAddress("address");
		blockchainWallet.setAttribute("validatorUsername", context.username);
		context.walletRepositoryBlockchain.index(blockchainWallet);
		assert.true(
			context.walletRepositoryBlockchain.hasByIndex(Contracts.State.WalletIndexes.Usernames, context.username),
		);

		const wallet = context.walletRepositoryClone.findByIndex(
			Contracts.State.WalletIndexes.Usernames,
			context.username,
		);

		assert.false(wallet === blockchainWallet);

		assert.equal(wallet.getAttribute("validatorUsername"), context.username);
		assert.true(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has(context.username),
		);
		assert.true(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).has(wallet.getAddress()),
		);
		assert.true(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has(context.username),
		);
	});

	it("findByIndex - should return existing wallet", async (context) => {
		const wallet = context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validatorUsername", context.username);
		context.walletRepositoryClone.index(wallet);

		assert.instance(wallet, Wallet);
		assert.equal(wallet.getAddress(), "address");
		assert.equal(wallet.getAttribute("validatorUsername"), context.username);
		assert.true(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has(context.username),
		);
		const existingWallet = context.walletRepositoryClone.findByIndex(
			Contracts.State.WalletIndexes.Usernames,
			context.username,
		);

		assert.equal(wallet, existingWallet);
		assert.false(
			context.walletRepositoryBlockchain.hasByIndex(Contracts.State.WalletIndexes.Usernames, context.username),
		);
	});

	it("findByIndex - should throw error if does not exist in blockchain wallet repository", (context) => {
		assert.throws(() => {
			context.walletRepositoryClone.findByIndex(Contracts.State.WalletIndexes.Usernames, context.username);
		}, "Wallet genesis_1 doesn't exist in index usernames");
	});

	it("hasByAddress - should return true if wallet exist in blockchain wallet repository", (context) => {
		context.walletRepositoryBlockchain.findByAddress("address");

		assert.true(context.walletRepositoryBlockchain.hasByAddress("address"));
		assert.true(context.walletRepositoryClone.hasByAddress("address"));
	});

	it("hasByAddress - should return true if wallet exist in clone wallet repository", (context) => {
		context.walletRepositoryClone.findByAddress("address");

		assert.false(context.walletRepositoryBlockchain.hasByAddress("address"));
		assert.true(context.walletRepositoryClone.hasByAddress("address"));
	});

	it("hasByAddress - should return false if wallet does not exist in clone wallet repository", (context) => {
		assert.false(context.walletRepositoryBlockchain.hasByAddress("address"));
		assert.false(context.walletRepositoryClone.hasByAddress("address"));
	});

	it("hasByPublicKey - should return true if wallet exist in blockchain wallet repository", async (context) => {
		await context.walletRepositoryBlockchain.findByPublicKey(context.publicKey);

		assert.true(context.walletRepositoryBlockchain.hasByPublicKey(context.publicKey));
		assert.true(context.walletRepositoryClone.hasByPublicKey(context.publicKey));
	});

	it("hasByPublicKey - should return true if wallet exist in clone wallet repository", async (context) => {
		await context.walletRepositoryClone.findByPublicKey(context.publicKey);

		assert.false(context.walletRepositoryBlockchain.hasByPublicKey(context.publicKey));
		assert.true(context.walletRepositoryClone.hasByPublicKey(context.publicKey));
	});

	it("hasByPublicKey - should return false if wallet does not exist in clone wallet repository", (context) => {
		assert.false(context.walletRepositoryBlockchain.hasByPublicKey(context.publicKey));
		assert.false(context.walletRepositoryClone.hasByPublicKey(context.publicKey));
	});

	it("hasByUsername - should return true if wallet exist in blockchain wallet repository", (context) => {
		const blockchainWallet = context.walletRepositoryBlockchain.findByAddress("address");
		blockchainWallet.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryBlockchain.index(blockchainWallet);

		assert.true(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));
		assert.true(context.walletRepositoryClone.hasByUsername("genesis_1"));
	});

	it("hasByUsername - should return true if wallet exist in clone wallet repository", async (context) => {
		const wallet = context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryClone.index(wallet);

		assert.false(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));
		assert.true(context.walletRepositoryClone.hasByUsername("genesis_1"));
	});

	it("hasByUsername - should return false if wallet does not exist in clone wallet repository", (context) => {
		assert.false(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));
		assert.false(context.walletRepositoryClone.hasByUsername("genesis_1"));
	});

	it("hasByIndex - should return true if wallet exist in blockchain wallet repository", async (context) => {
		const wallet = context.walletRepositoryBlockchain.findByAddress("address");
		wallet.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryBlockchain.index(wallet);

		assert.true(
			context.walletRepositoryBlockchain.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"),
		);
		assert.true(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));
	});

	it("hasByIndex - should return true if wallet exist in clone wallet repository", async (context) => {
		const wallet = context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryClone.index(wallet);

		assert.false(
			context.walletRepositoryBlockchain.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"),
		);
		assert.true(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));
	});

	it("hasByIndex - should return false if wallet does not exist in clone wallet repository", (context) => {
		assert.false(context.walletRepositoryBlockchain.hasByAddress("address"));
		assert.false(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));
	});

	it("hasByIndex - should return false if index is forgotten", async (context) => {
		const wallet = context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryClone.index(wallet);

		assert.true(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));

		wallet.forgetAttribute("validatorUsername");
		context.walletRepositoryClone.index(wallet);

		assert.false(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));
	});

	it("hasByIndex - should return false if index is forgotten bu forgetOnIndex method", async (context) => {
		const wallet = context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryClone.index(wallet);

		assert.true(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));

		context.walletRepositoryClone.forgetOnIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1");

		assert.false(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));
	});

	it("hasByIndex - should return false if index is forgotten, but still exist on blockchain wallet repository", async (context) => {
		const blockchainWallet = context.walletRepositoryBlockchain.findByAddress("address");
		blockchainWallet.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryBlockchain.index(blockchainWallet);

		const wallet = await context.walletRepositoryClone.findByAddress("address");
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("genesis_1"));
		assert.true(wallet.hasAttribute("validatorUsername"));

		assert.true(
			context.walletRepositoryBlockchain.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"),
		);
		assert.true(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));

		wallet.forgetAttribute("validatorUsername");
		context.walletRepositoryClone.index(wallet);

		assert.true(
			context.walletRepositoryBlockchain.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"),
		);
		assert.false(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));
	});

	it("hasByIndex - should return false if index is forgotten and set again and still exist on blockchain wallet repository", async (context) => {
		const blockchainWallet = context.walletRepositoryBlockchain.findByAddress("address");
		blockchainWallet.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryBlockchain.index(blockchainWallet);

		const wallet = context.walletRepositoryClone.findByAddress("address");

		assert.true(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));

		wallet.forgetAttribute("validatorUsername");
		context.walletRepositoryClone.index(wallet);

		assert.false(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));

		// Set same index again
		wallet.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryClone.index(wallet);

		assert.true(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));
	});

	it("allByAddress - should return all wallets from clone and blockchain wallet repository by address", (context) => {
		assert.equal(context.walletRepositoryClone.allByAddress().length, 0);

		context.walletRepositoryClone.findByAddress("address_1");
		assert.equal(context.walletRepositoryClone.allByAddress().length, 1);

		context.walletRepositoryBlockchain.findByAddress("address_2");
		assert.equal(context.walletRepositoryClone.allByAddress().length, 2);
	});

	it("allByPublicKey - should return all wallets from clone and blockchain wallet repository by public key", async (context) => {
		assert.equal(context.walletRepositoryClone.allByPublicKey().length, 0);

		await context.walletRepositoryClone.findByPublicKey(
			"03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37",
		);
		assert.equal(context.walletRepositoryClone.allByPublicKey().length, 1);

		await context.walletRepositoryBlockchain.findByPublicKey(
			"02def27da9336e7fbf63131b8d7e5c9f45b296235db035f1f4242c507398f0f21d",
		);
		assert.equal(context.walletRepositoryClone.allByPublicKey().length, 2);

		context.walletRepositoryClone.findByAddress("address_1");
		context.walletRepositoryBlockchain.findByAddress("address_2");

		assert.equal(context.walletRepositoryClone.allByPublicKey().length, 2);
	});

	it("allByUsername - should return all wallets from clone and blockchain wallet repository by username", (context) => {
		assert.equal(context.walletRepositoryClone.allByUsername().length, 0);

		const wallet_1 = context.walletRepositoryClone.findByAddress("address_1");
		wallet_1.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryClone.index(wallet_1);
		assert.equal(context.walletRepositoryClone.allByUsername().length, 1);

		const wallet_2 = context.walletRepositoryBlockchain.findByAddress("address_2");
		wallet_2.setAttribute("validatorUsername", "genesis_2");
		context.walletRepositoryBlockchain.index(wallet_2);

		assert.equal(context.walletRepositoryClone.allByUsername().length, 2);
	});

	it("allByUsername - should skip wallets when key is removed from index", async (context) => {
		const wallet = context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryClone.index(wallet);

		assert.equal(context.walletRepositoryClone.allByUsername().length, 1);

		wallet.forgetAttribute("validatorUsername");
		context.walletRepositoryClone.index(wallet);

		assert.equal(context.walletRepositoryClone.allByUsername().length, 0);
	});

	it("allByUsername - should skip wallets when key is removed from index, but still exists on blockchain index", async (context) => {
		const blockchainWallet = context.walletRepositoryBlockchain.findByAddress("address");
		blockchainWallet.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryBlockchain.index(blockchainWallet);

		assert.equal(context.walletRepositoryClone.allByUsername().length, 1);

		const wallet = context.walletRepositoryClone.findByAddress("address");
		wallet.forgetAttribute("validatorUsername");
		context.walletRepositoryClone.index(wallet);

		assert.equal(context.walletRepositoryClone.allByUsername().length, 0);
		assert.equal(context.walletRepositoryBlockchain.allByUsername().length, 1);
	});

	it.skip("allByIndex - should return all wallets from clone and blockchain wallet repository by address", (context) => {
		assert.equal(context.walletRepositoryClone.allByIndex(Contracts.State.WalletIndexes.Usernames).length, 0);

		const wallet1 = context.walletRepositoryClone.findByAddress("address_1");
		context.walletRepositoryClone.setOnIndex(Contracts.State.WalletIndexes.Usernames, "usernames_1", wallet1);

		assert.equal(context.walletRepositoryClone.allByIndex(Contracts.State.WalletIndexes.Usernames), [wallet1]);

		const wallet2 = context.walletRepositoryBlockchain.findByAddress("address_2");
		context.walletRepositoryBlockchain.setOnIndex(Contracts.State.WalletIndexes.Usernames, "usernames_2", wallet2);

		assert.equal(context.walletRepositoryClone.allByIndex(Contracts.State.WalletIndexes.Usernames), [
			wallet1,
			wallet2,
		]);
	});

	it("reset - should clear all indexes and forgetIndexes", async (context) => {
		const wallet = context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryClone.index(wallet);

		wallet.forgetAttribute("validatorUsername");
		context.walletRepositoryClone.index(wallet);

		assert.equal(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).values().length,
			1,
		);

		context.walletRepositoryClone.reset();

		assert.equal(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).values().length,
			0,
		);
	});

	it("commitChanges - should commit wallet changes to the blockchain wallet repository", async (context) => {
		context.walletRepositoryBlockchain.findByAddress("address");
		const walletClone = context.walletRepositoryClone.findByAddress("address");

		walletClone.setAttribute("validatorUsername", "genesis_1");

		assert.false(context.walletRepositoryBlockchain.findByAddress("address").hasAttribute("validatorUsername"));
		assert.true(context.walletRepositoryClone.findByAddress("address").hasAttribute("validatorUsername"));

		context.walletRepositoryClone.commitChanges();

		assert.true(context.walletRepositoryBlockchain.findByAddress("address").hasAttribute("validatorUsername"));
		assert.true(context.walletRepositoryClone.findByAddress("address").hasAttribute("validatorUsername"));
		assert.true(context.walletRepositoryBlockchain.findByAddress("address") === walletClone);
	});

	it("commitChanges - should create new wallets in the blockchain wallet repository", async (context) => {
		const walletClone = context.walletRepositoryClone.findByAddress("address");

		assert.false(context.walletRepositoryBlockchain.hasByAddress("address"));
		assert.true(context.walletRepositoryClone.hasByAddress("address"));

		context.walletRepositoryClone.commitChanges();

		assert.true(context.walletRepositoryBlockchain.hasByAddress("address"));
		assert.true(context.walletRepositoryClone.hasByAddress("address"));
		assert.true(context.walletRepositoryBlockchain.findByAddress("address") === walletClone);
	});

	it("commitChanges - should sync index changes for existing wallet", async (context) => {
		context.walletRepositoryBlockchain.findByAddress("address");
		const walletClone = context.walletRepositoryClone.findByAddress("address");

		walletClone.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryClone.index(walletClone);

		assert.false(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));
		assert.true(context.walletRepositoryClone.hasByUsername("genesis_1"));

		context.walletRepositoryClone.commitChanges();

		assert.true(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));
		assert.true(context.walletRepositoryClone.hasByUsername("genesis_1"));
		assert.true(context.walletRepositoryBlockchain.findByAddress("address") === walletClone);
	});

	it("commitChanges - should sync index changes for new wallet", async (context) => {
		const walletClone = context.walletRepositoryClone.findByAddress("address");

		walletClone.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryClone.index(walletClone);

		assert.false(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));
		assert.true(context.walletRepositoryClone.hasByUsername("genesis_1"));

		context.walletRepositoryClone.commitChanges();

		assert.true(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));
		assert.true(context.walletRepositoryClone.hasByUsername("genesis_1"));
		assert.true(context.walletRepositoryBlockchain.findByAddress("address") === walletClone);
	});

	it("commitChanges - should sync index changes for existing wallet when index value is removed", async (context) => {
		const walletBlockchain = context.walletRepositoryBlockchain.findByAddress("address");
		walletBlockchain.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryBlockchain.index(walletBlockchain);

		const walletClone = context.walletRepositoryClone.findByAddress("address");

		assert.true(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));
		assert.true(context.walletRepositoryClone.hasByUsername("genesis_1"));

		walletClone.forgetAttribute("validatorUsername");
		context.walletRepositoryClone.index(walletClone);

		assert.true(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));
		assert.false(context.walletRepositoryClone.hasByUsername("genesis_1"));

		context.walletRepositoryClone.commitChanges();

		assert.false(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));
		assert.false(context.walletRepositoryClone.hasByUsername("genesis_1"));
		assert.true(context.walletRepositoryBlockchain.findByAddress("address") === walletClone);
	});

	it("commitChanges - should sync index changes for existing wallet when index value is set and removed only on clone", async (context) => {
		const walletClone = context.walletRepositoryClone.findByAddress("address");
		walletClone.setAttribute("validatorUsername", "genesis_1");
		context.walletRepositoryClone.index(walletClone);

		assert.false(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));
		assert.true(context.walletRepositoryClone.hasByUsername("genesis_1"));

		walletClone.forgetAttribute("validatorUsername");
		context.walletRepositoryClone.index(walletClone);

		assert.false(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));
		assert.false(context.walletRepositoryClone.hasByUsername("genesis_1"));

		context.walletRepositoryClone.commitChanges();

		assert.false(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));
		assert.false(context.walletRepositoryClone.hasByUsername("genesis_1"));
		assert.true(context.walletRepositoryBlockchain.findByAddress("address") === walletClone);
	});
});
