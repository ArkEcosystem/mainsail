import { fromSeed } from "bip32";
import { describe } from "@arkecosystem/core-test-framework";
import { HDWallet } from "./";
import { Address } from "../identities";
import { configManager } from "../managers/config";
import { mainnet } from "../networks";
import { NetworkConfig } from "../interfaces";

describe<{
	config: NetworkConfig;
	mnemonic: string;
}>("HDWallet", ({ it, assert, beforeAll, afterAll }) => {
	beforeAll((context) => {
		context.mnemonic =
			"sorry hawk one science reject employ museum ride into post machine attack bar seminar myself unhappy faculty differ grain fish chest bird muffin mesh";
		context.config = configManager.all();

		configManager.setConfig(mainnet);
	});

	afterAll((context) => {
		configManager.setConfig(context.config);
	});

	it("bip32 - can create a BIP32 wallet external address", () => {
		const path = "m/0'/0/0";
		const root = fromSeed(Buffer.from("dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd", "hex"));

		const child1 = root.derivePath(path);

		// option 2, manually
		const child2 = root.deriveHardened(0).derive(0).derive(0);

		assert.equal(Address.fromPublicKey(child1.publicKey.toString("hex")), "AZXdSTRFGHPokX6yfXTfHcTzzHKncioj31");
		assert.equal(Address.fromPublicKey(child2.publicKey.toString("hex")), "AZXdSTRFGHPokX6yfXTfHcTzzHKncioj31");
	});

	it("bip44 - can create a BIP44, ark, account 0, external address", () => {
		const path = "m/44'/111'/0'/0/0";
		const root = fromSeed(Buffer.from("dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd", "hex"));

		const child1 = root.derivePath(path);

		// option 2, manually
		const child2 = root.deriveHardened(44).deriveHardened(111).deriveHardened(0).derive(0).derive(0);

		assert.equal(Address.fromPublicKey(child1.publicKey.toString("hex")), "AKdstZSrxzeF54e1M41fQzqGqjod9ydG3E");
		assert.equal(Address.fromPublicKey(child2.publicKey.toString("hex")), "AKdstZSrxzeF54e1M41fQzqGqjod9ydG3E");
	});

	it("fromMnemonic - should return the root node", (context) => {
		const root = HDWallet.fromMnemonic(context.mnemonic);
		assert.equal(root.constructor.name, "BIP32");
	});

	it("fromMnemonic - should derive path", (context) => {
		const root = HDWallet.fromMnemonic(context.mnemonic);
		const node = root.derivePath("44'/1'/0'/0/0");
		assert.equal(
			node.publicKey.toString("hex"),
			"02126148679f22c162afa24a264a6b6722a61aab622248f2f536da289f48a9291f",
		);
		assert.equal(
			node.privateKey.toString("hex"),
			"b6f84081b674cf1f765ac182aaabd94d944c367d214263d1f7f3102d1cec98d5",
		);
	});

	it("getKeys - should return keys from a node", (context) => {
		const root = HDWallet.fromMnemonic(context.mnemonic);
		const node = root.derivePath("44'/1'/0'/0/0");
		const keys = HDWallet.getKeys(node);
		assert.equal(keys.publicKey, "02126148679f22c162afa24a264a6b6722a61aab622248f2f536da289f48a9291f");
		assert.equal(keys.privateKey, "b6f84081b674cf1f765ac182aaabd94d944c367d214263d1f7f3102d1cec98d5");
		assert.true(keys.compressed);
	});

	it("fromKeys - should return node from keys", () => {
		const keys = {
			publicKey: "",
			privateKey: "b6f84081b674cf1f765ac182aaabd94d944c367d214263d1f7f3102d1cec98d5",
			compressed: true,
		};

		const chainCode = Buffer.from("2bbe729fab21bf8bca70763caf7fe85752726a363b494dea7a65e51e2d423d7b", "hex");
		const node = HDWallet.fromKeys(keys, chainCode);
		assert.equal(
			node.publicKey.toString("hex"),
			"02126148679f22c162afa24a264a6b6722a61aab622248f2f536da289f48a9291f",
		);
		assert.equal(
			node.privateKey.toString("hex"),
			"b6f84081b674cf1f765ac182aaabd94d944c367d214263d1f7f3102d1cec98d5",
		);
	});

	it("fromKeys - should throw if keys are not compressed", () => {
		const keys = {
			publicKey: "",
			privateKey: "b6f84081b674cf1f765ac182aaabd94d944c367d214263d1f7f3102d1cec98d5",
			compressed: false,
		};

		const chainCode = Buffer.from("2bbe729fab21bf8bca70763caf7fe85752726a363b494dea7a65e51e2d423d7b", "hex");
		assert.throws(() => HDWallet.fromKeys(keys, chainCode), "BIP32 only allows compressed keys.");
	});

	it("deriveSlip44 - should derive path", (context) => {
		const root = HDWallet.fromMnemonic(context.mnemonic);

		const actual = HDWallet.deriveSlip44(root).deriveHardened(0).derive(0).derive(0);

		const expected = root.deriveHardened(44).deriveHardened(111).deriveHardened(0).derive(0).derive(0);

		assert.equal(Address.fromPublicKey(actual.publicKey.toString("hex")), "AHQhEsLWX5BbvvK836f1rUyZZZ77YikYq5");
		assert.equal(
			actual.publicKey.toString("hex"),
			"0330d7c2df15da16c72ac524f7548b2bca689beb0527ce54a50d3b79e4e91a8e9b",
		);
		assert.equal(
			actual.privateKey.toString("hex"),
			"693bef1f16bad3c8096191af2362dae95873468fc5de30510b61d36fb3f1e33c",
		);

		assert.equal(actual.publicKey, expected.publicKey);
		assert.equal(actual.privateKey, expected.privateKey);
	});

	it("deriveNetwork - should derive path", (context) => {
		const root = HDWallet.fromMnemonic(context.mnemonic);

		const actual = HDWallet.deriveNetwork(root).deriveHardened(0).derive(0);

		assert.equal(Address.fromPublicKey(actual.publicKey.toString("hex")), "AKjBp5V1xG9c5PQqUvtvtoGjvnyA3wLVpA");
		assert.equal(
			actual.publicKey.toString("hex"),
			"0281d69cadc9cf1bbbadd69503f071ce5de3826cee702e67a21d86f4fbe2d61b77",
		);
		assert.equal(
			actual.privateKey.toString("hex"),
			"de9b9b025d65b61a997c100419df05d1a26a4053f668e42e7ab2747ac6eed997",
		);
	});
});
