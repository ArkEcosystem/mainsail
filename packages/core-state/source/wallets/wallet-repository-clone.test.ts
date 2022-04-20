import { Selectors } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Services } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

import { AddressFactory } from "../../../core-crypto-address-base58/source/address.factory";
import { Configuration } from "../../../core-crypto-config";
import { KeyPairFactory } from "../../../core-crypto-key-pair-schnorr/source/pair";
import { PublicKeyFactory } from "../../../core-crypto-key-pair-schnorr/source/public";
import { describe, Sandbox } from "../../../core-test-framework";
import {
	addressesIndexer,
	publicKeysIndexer,
	usernamesIndexer,
	Wallet,
	WalletRepository,
	WalletRepositoryClone,
} from ".";
import { walletFactory } from "./wallet-factory";

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

		app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator");
		app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator.username");
		app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator.voteBalance");
		app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator.producedBlocks");
		app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator.forgedTotal");
		app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator.approval");
		app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator.resigned");
		app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator.rank");
		app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator.round");
		app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("usernames");

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

	it("createWallet - should create wallet by address", async (context) => {
		const wallet = await context.walletRepositoryClone.createWallet("address");

		assert.instance(wallet, Wallet);
		assert.equal(wallet.getAddress(), "address");
	});

	it("getIndex - should return wallet repository clone index", async (context) => {
		context.walletRepositoryBlockchain.findByAddress("address_1");
		const wallet = context.walletRepositoryClone.findByAddress("address_2");

		assert.equal(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).values(), [
			wallet,
		]);
	});

	it("getIndexNames - should return index names", (context) => {
		assert.equal(context.walletRepositoryClone.getIndexNames(), ["addresses", "publicKeys", "usernames"]);
	});

	it("index - should index single wallet if there are no changes in indexes", async (context) => {
		const wallet = await context.walletRepositoryClone.findByAddress("address");

		context.walletRepositoryClone.index(wallet);
	});

	it("index - should index single wallet if wallet change results in set on index", async (context) => {
		const wallet = await context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validator.username", "genesis_1");

		assert.false(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("genesis_1"));

		context.walletRepositoryClone.index(wallet);

		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("genesis_1"));
	});

	it("index - should index single wallet if wallet change results in forget on index", async (context) => {
		const wallet = await context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validator.username", "genesis_1");
		context.walletRepositoryClone.index(wallet);
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("genesis_1"));

		wallet.forgetAttribute("validator");
		context.walletRepositoryClone.index(wallet);

		assert.false(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("genesis_1"));

		// assert.true(
		// 	@ts-ignore .forgetIndexes is now private: .#forgetIndexes
		// 	context.walletRepositoryClone.forgetIndexes[Contracts.State.WalletIndexes.Usernames].has("genesis_1"),
		// );
	});

	it("index - should index wallet array", (context) => {
		const wallet1 = context.walletRepositoryClone.findByAddress("address_1");
		const wallet2 = context.walletRepositoryClone.findByAddress("address_2");

		context.walletRepositoryClone.index([wallet1, wallet2]);
	});

	it("forgetOnIndex - should clone wallet and set key on forget index if key exists only on blockchain wallet repository", (context) => {
		const blockchainWallet = context.walletRepositoryBlockchain.findByAddress("address");
		context.walletRepositoryBlockchain
			.getIndex(Contracts.State.WalletIndexes.Usernames)
			.set("key", blockchainWallet);

		context.walletRepositoryClone.forgetOnIndex(Contracts.State.WalletIndexes.Usernames, "key");

		assert.false(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("key"));
		// @ts-ignore .forgetIndexes is now private: .#forgetIndexes
		// assert.true(context.walletRepositoryClone.forgetIndexes[Contracts.State.WalletIndexes.Usernames].has("key"));
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).has("address"));
	});

	it("forgetOnIndex - should set key on forget index if key exists on wallet repository clone", async (context) => {
		const wallet = await context.walletRepositoryClone.findByAddress("address");
		context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).set("key", wallet);
		assert.true(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "key"));

		context.walletRepositoryClone.forgetOnIndex(Contracts.State.WalletIndexes.Usernames, "key");

		assert.false(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("key"));
		// @ts-ignore .forgetIndexes is now private: .#forgetIndexes
		// assert.true(context.walletRepositoryClone.forgetIndexes[Contracts.State.WalletIndexes.Usernames].has("key"));
		assert.false(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "key"));
	});

	it("forgetOnIndex - should skip setting key if does not exist", (context) => {
		context.walletRepositoryClone.forgetOnIndex(Contracts.State.WalletIndexes.Usernames, "key");

		// @ts-ignore .forgetIndexes is now private: .#forgetIndexes
		// assert.false(context.walletRepositoryClone.forgetIndexes[Contracts.State.WalletIndexes.Usernames].has("key"));
	});

	it.skip("findByAddress - should copy and index wallet from blockchain wallet repository if exist in blockchain wallet repository", async (context) => {
		const blockchainWallet = context.walletRepositoryBlockchain.findByAddress("address");
		assert.true(context.walletRepositoryBlockchain.hasByAddress("address"));
		context.walletRepositoryBlockchain
			.getIndex(Contracts.State.WalletIndexes.Usernames)
			.set("key", blockchainWallet);

		const wallet = await context.walletRepositoryClone.findByAddress("address");

		assert.not.equal(wallet, blockchainWallet);
		assert.equal(wallet, blockchainWallet);
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).has("address"));
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("key"));
	});

	it("findByAddress - should create and index new wallet if does not exist in blockchain wallet repository", async (context) => {
		const wallet = await context.walletRepositoryClone.findByAddress("address");

		assert.instance(wallet, Wallet);
		assert.equal(wallet.getAddress(), "address");
		assert.true(context.walletRepositoryClone.hasByAddress("address"));
		assert.false(context.walletRepositoryBlockchain.hasByAddress("address"));
	});

	it("findByAddress - should return existing wallet", async (context) => {
		const spyOnCreateWallet = spy(context.walletRepositoryClone, "createWallet");

		const wallet = await context.walletRepositoryClone.findByAddress("address");

		assert.instance(wallet, Wallet);
		assert.equal(wallet.getAddress(), "address");
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).has("address"));
		spyOnCreateWallet.calledOnce();

		spyOnCreateWallet.reset();

		const existingWallet = context.walletRepositoryClone.findByAddress("address");

		assert.equal(wallet, existingWallet);
		spyOnCreateWallet.neverCalled();
		assert.false(context.walletRepositoryBlockchain.hasByAddress("address"));
	});

	it.skip("findByPublicKey - should copy and index wallet from blockchain wallet repository if exist in blockchain wallet repository", async (context) => {
		const blockchainWallet = await context.walletRepositoryBlockchain.findByPublicKey(context.publicKey);
		assert.true(context.walletRepositoryBlockchain.hasByPublicKey(context.publicKey));
		context.walletRepositoryBlockchain
			.getIndex(Contracts.State.WalletIndexes.Usernames)
			.set("key", blockchainWallet);

		const wallet = await context.walletRepositoryClone.findByPublicKey(context.publicKey);

		assert.instance(wallet, Wallet);
		assert.equal(wallet.getPublicKey(), context.publicKey);
		assert.true(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.PublicKeys).has(context.publicKey),
		);
		assert.true(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).has(wallet.getAddress()),
		);
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("key"));

		assert.not.equal(wallet, blockchainWallet);
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
		const spyOnCreateWallet = spy(context.walletRepositoryClone, "createWallet");

		const wallet = await context.walletRepositoryClone.findByPublicKey(context.publicKey);

		assert.instance(wallet, Wallet);
		assert.equal(wallet.getPublicKey(), context.publicKey);
		assert.true(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.PublicKeys).has(context.publicKey),
		);
		spyOnCreateWallet.calledOnce();

		spyOnCreateWallet.reset();
		const existingWallet = await context.walletRepositoryClone.findByPublicKey(context.publicKey);

		assert.equal(wallet, existingWallet);
		spyOnCreateWallet.neverCalled();
		assert.false(context.walletRepositoryBlockchain.hasByPublicKey(context.publicKey));
	});

	it("findByUsername - should copy and index wallet from blockchain wallet repository if exist in blockchain wallet repository", async (context) => {
		const blockchainWallet = context.walletRepositoryBlockchain.findByAddress("address");
		blockchainWallet.setAttribute("validator.username", "genesis_1");
		context.walletRepositoryBlockchain.index(blockchainWallet);
		assert.true(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));

		const wallet = await context.walletRepositoryClone.findByUsername("genesis_1");

		assert.not.equal(wallet, blockchainWallet);
		blockchainWallet.setPublicKey();
		assert.equal(wallet, blockchainWallet);
		assert.equal(wallet.getAttribute("validator.username"), "genesis_1");
		assert.true(context.walletRepositoryClone.hasByUsername("genesis_1"));
	});

	it("findByUsername - should return existing wallet", async (context) => {
		const wallet = await context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validator.username", "genesis_1");
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
		assert.not.equal(context.walletRepositoryClone.findByIndexes(["addresses"], "address"), blockchainWallet);

		blockchainWallet.setPublicKey();

		assert.equal(context.walletRepositoryClone.findByIndexes(["addresses"], "address"), blockchainWallet);
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).has("address"));
	});

	it("findByIndexes - should return wallet from wallet repository clone", async (context) => {
		const wallet = await context.walletRepositoryClone.findByAddress("address");

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
		blockchainWallet.setAttribute("validator.username", context.username);
		context.walletRepositoryBlockchain.index(blockchainWallet);
		context.walletRepositoryBlockchain
			.getIndex(Contracts.State.WalletIndexes.Usernames)
			.set("key", blockchainWallet);
		assert.true(
			context.walletRepositoryBlockchain.hasByIndex(Contracts.State.WalletIndexes.Usernames, context.username),
		);

		const wallet = await context.walletRepositoryClone.findByIndex(
			Contracts.State.WalletIndexes.Usernames,
			context.username,
		);

		assert.not.equal(wallet, blockchainWallet);
		blockchainWallet.setPublicKey();

		assert.equal(wallet, blockchainWallet);
		assert.equal(wallet.getAttribute("validator.username"), context.username);
		assert.true(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has(context.username),
		);
		assert.true(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).has(wallet.getAddress()),
		);
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("key"));
	});

	it("findByIndex - should return existing wallet", async (context) => {
		const spyOnCreateWallet = spy(context.walletRepositoryClone, "createWallet");

		const wallet = await context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validator.username", context.username);
		context.walletRepositoryClone.index(wallet);

		assert.instance(wallet, Wallet);
		assert.equal(wallet.getAddress(), "address");
		assert.equal(wallet.getAttribute("validator.username"), context.username);
		assert.true(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has(context.username),
		);
		spyOnCreateWallet.calledOnce();

		spyOnCreateWallet.reset();
		const existingWallet = context.walletRepositoryClone.findByIndex(
			Contracts.State.WalletIndexes.Usernames,
			context.username,
		);

		assert.equal(wallet, existingWallet);
		spyOnCreateWallet.neverCalled();
		assert.false(
			context.walletRepositoryBlockchain.hasByIndex(Contracts.State.WalletIndexes.Usernames, context.username),
		);
	});

	it("findByIndex - should throw error if does not exist in blockchain wallet repository", (context) => {
		assert.throws(() => {
			context.walletRepositoryClone.findByIndex(Contracts.State.WalletIndexes.Usernames, context.username);
		}, "Wallet genesis_1 doesn't exist in index usernames");
	});

	it("has - should return true if key exist in blockchain wallet repository", (context) => {
		context.walletRepositoryBlockchain.findByAddress("address");

		assert.true(context.walletRepositoryBlockchain.has("address"));
		assert.true(context.walletRepositoryClone.has("address"));
	});

	it("has - should return true if key exist in clone wallet repository", (context) => {
		context.walletRepositoryClone.findByAddress("address");

		assert.false(context.walletRepositoryBlockchain.has("address"));
		assert.true(context.walletRepositoryClone.has("address"));
	});

	it("has - should return false if key does not exist in clone wallet repository", (context) => {
		assert.false(context.walletRepositoryBlockchain.has("address"));
		assert.false(context.walletRepositoryClone.has("address"));
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
		blockchainWallet.setAttribute("validator.username", "genesis_1");
		context.walletRepositoryBlockchain.index(blockchainWallet);

		assert.true(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));
		assert.true(context.walletRepositoryClone.hasByUsername("genesis_1"));
	});

	it("hasByUsername - should return true if wallet exist in clone wallet repository", async (context) => {
		const wallet = await context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validator.username", "genesis_1");
		context.walletRepositoryClone.index(wallet);

		assert.false(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));
		assert.true(context.walletRepositoryClone.hasByUsername("genesis_1"));
	});

	it("hasByUsername - should return false if wallet does not exist in clone wallet repository", (context) => {
		assert.false(context.walletRepositoryBlockchain.hasByUsername("genesis_1"));
		assert.false(context.walletRepositoryClone.hasByUsername("genesis_1"));
	});

	it("hasByIndex - should return true if wallet exist in blockchain wallet repository", async (context) => {
		const wallet = await context.walletRepositoryBlockchain.findByAddress("address");
		wallet.setAttribute("validator.username", "genesis_1");
		context.walletRepositoryBlockchain.index(wallet);

		assert.true(
			context.walletRepositoryBlockchain.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"),
		);
		assert.true(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));
	});

	it("hasByIndex - should return true if wallet exist in clone wallet repository", async (context) => {
		const wallet = await context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validator.username", "genesis_1");
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
		const wallet = await context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validator.username", "genesis_1");
		context.walletRepositoryClone.index(wallet);

		assert.true(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));

		wallet.forgetAttribute("validator");
		context.walletRepositoryClone.index(wallet);

		assert.false(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));
	});

	it("hasByIndex - should return false if index is forgotten bu forgetOnIndex method", async (context) => {
		const wallet = await context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validator.username", "genesis_1");
		context.walletRepositoryClone.index(wallet);

		assert.true(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));

		context.walletRepositoryClone.forgetOnIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1");

		assert.false(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));
	});

	it("hasByIndex - should return false if index is forgotten, but still exist on blockchain wallet repository", async (context) => {
		const blockchainWallet = context.walletRepositoryBlockchain.findByAddress("address");
		blockchainWallet.setAttribute("validator.username", "genesis_1");
		context.walletRepositoryBlockchain.index(blockchainWallet);

		const wallet = await context.walletRepositoryClone.findByAddress("address");
		assert.true(context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Usernames).has("genesis_1"));
		assert.true(wallet.hasAttribute("validator.username"));

		assert.true(
			context.walletRepositoryBlockchain.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"),
		);
		assert.true(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));

		wallet.forgetAttribute("validator");
		context.walletRepositoryClone.index(wallet);

		assert.true(
			context.walletRepositoryBlockchain.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"),
		);
		// assert.true(
		// 	// @ts-ignore .forgetIndexes is now private: .#forgetIndexes
		// 	context.walletRepositoryClone.forgetIndexes[Contracts.State.WalletIndexes.Usernames].has("genesis_1"),
		// );
		assert.false(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));
	});

	it("hasByIndex - should return false if index is forgotten and set again and still exist on blockchain wallet repository", async (context) => {
		const blockchainWallet = context.walletRepositoryBlockchain.findByAddress("address");
		blockchainWallet.setAttribute("validator.username", "genesis_1");
		context.walletRepositoryBlockchain.index(blockchainWallet);

		const wallet = await context.walletRepositoryClone.findByAddress("address");

		assert.true(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));

		wallet.forgetAttribute("validator");
		context.walletRepositoryClone.index(wallet);

		assert.false(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));

		// Set same index again
		wallet.setAttribute("validator.username", "genesis_1");
		context.walletRepositoryClone.index(wallet);

		assert.true(context.walletRepositoryClone.hasByIndex(Contracts.State.WalletIndexes.Usernames, "genesis_1"));
	});

	it("getNonce - should return 0 if wallet does not exists", async (context) => {
		assert.equal(await context.walletRepositoryClone.getNonce(context.publicKey), BigNumber.ZERO);
	});

	it("getNonce - should return nonce if wallet exists only in blockchain wallet repository", async (context) => {
		const wallet = await context.walletRepositoryBlockchain.findByPublicKey(context.publicKey);
		wallet.setNonce(BigNumber.make("10"));

		assert.equal(await context.walletRepositoryClone.getNonce(context.publicKey), BigNumber.make("10"));
		assert.true(
			context.walletRepositoryBlockchain
				.getIndex(Contracts.State.WalletIndexes.PublicKeys)
				.has(context.publicKey),
		);
		assert.false(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.PublicKeys).has(context.publicKey),
		);
	});

	it("getNonce - should return nonce if wallet exists on copy wallet repository", async (context) => {
		const blockchainWallet = await context.walletRepositoryBlockchain.findByPublicKey(context.publicKey);
		blockchainWallet.setNonce(BigNumber.make("10"));

		const wallet = await context.walletRepositoryClone.findByPublicKey(context.publicKey);
		wallet.setNonce(BigNumber.make("20"));

		assert.equal(await context.walletRepositoryClone.getNonce(context.publicKey), BigNumber.make("20"));
		assert.true(
			context.walletRepositoryBlockchain
				.getIndex(Contracts.State.WalletIndexes.PublicKeys)
				.has(context.publicKey),
		);
		assert.true(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.PublicKeys).has(context.publicKey),
		);
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
		wallet_1.setAttribute("validator.username", "genesis_1");
		context.walletRepositoryClone.index(wallet_1);
		assert.equal(context.walletRepositoryClone.allByUsername().length, 1);

		const wallet_2 = context.walletRepositoryBlockchain.findByAddress("address_2");
		wallet_2.setAttribute("validator.username", "genesis_2");
		context.walletRepositoryBlockchain.index(wallet_2);

		assert.equal(context.walletRepositoryClone.allByUsername().length, 2);
	});

	it("allByUsername - should skip wallets when key is removed from index", async (context) => {
		const wallet = await context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validator.username", "genesis_1");
		context.walletRepositoryClone.index(wallet);

		assert.equal(context.walletRepositoryClone.allByUsername().length, 1);

		wallet.forgetAttribute("validator");
		context.walletRepositoryClone.index(wallet);

		assert.equal(context.walletRepositoryClone.allByUsername().length, 0);
	});

	it("allByUsername - should skip wallets when key is removed from index, but still exists on blockchain index", async (context) => {
		const blockchainWallet = context.walletRepositoryBlockchain.findByAddress("address");
		blockchainWallet.setAttribute("validator.username", "genesis_1");
		context.walletRepositoryBlockchain.index(blockchainWallet);

		assert.equal(context.walletRepositoryClone.allByUsername().length, 1);

		const wallet = await context.walletRepositoryClone.findByAddress("address");
		wallet.forgetAttribute("validator");
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
		const wallet = await context.walletRepositoryClone.findByAddress("address");
		wallet.setAttribute("validator.username", "genesis_1");
		context.walletRepositoryClone.index(wallet);

		wallet.forgetAttribute("validator");
		context.walletRepositoryClone.index(wallet);

		assert.equal(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).values().length,
			1,
		);
		// assert.equal(
		// 	// @ts-ignore .forgetIndexes is now private: .#forgetIndexes
		// 	context.walletRepositoryClone.forgetIndexes[Contracts.State.WalletIndexes.Usernames].values().length,
		// 	1,
		// );

		context.walletRepositoryClone.reset();

		assert.equal(
			context.walletRepositoryClone.getIndex(Contracts.State.WalletIndexes.Addresses).values().length,
			0,
		);
		// assert.equal(
		// 	// 	@ts-ignore .forgetIndexes is now private: .#forgetIndexes
		// 	context.walletRepositoryClone.forgetIndexes[Contracts.State.WalletIndexes.Usernames].values().length,
		// 	0,
		// );
	});

	it.skip("getForgetIndex - should throw error if index is not found", (context) => {
		assert.throws(() => {
			// @ts-ignore
			context.walletRepositoryClone.getForgetIndex("undefined");
		});
	});
});
