import type { Contracts } from "@mainsail/contracts";
import { describe } from "@mainsail/test-runner";
import { setupLegacySyncNode } from "./setup.js";
import { verifyLegacyNodeIntegrity } from "./integrity.js";
import { forgeTransactions, getApiRow, getWallets } from "./utilities.js";
import { dirSync } from "tmp";
import { parseEther } from "viem";
import { EvmCalls, Utils } from "@mainsail/test-transaction-builders";
import { Identifiers } from "@mainsail/constants";

const LEGACY_WALLET = "this is a top secret passphrase";

const COLD_WALLET = {
	address: "0xF82A036e580634d9Cb547F9c7934f17a5Afab806",
	legacyAddress: "DSMhswKjJ8SywxtH586mxcxLCrZhZSBQ4Q",
	mnemonic: "legacy cold wallet merge",
};

const FUNDED_COLD_WALLET = {
	address: "0x6C8e416A1f70ef9B12f713128311c32042783011",
	legacyAddress: "DTTxfLzLncEZghdyXG9ynYRHXxHqLgPGU1",
	mnemonic: "legacy cold wallet funded merge",
};

const MULTI_SIGNATURE_WALLET = "0xe3bF637932b59b1A8A9b5B370AeCb40A92575D9c";
const SECOND_SIGNATURE_WALLET = "0x10A906C67910067704D8123A0bC86502b126A162";

describe<{
	syncNode: Contracts.Kernel.Application;
	dataDirectory: string;
}>("Resync Legacy", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		const dataDirectory = dirSync({ unsafeCleanup: true }).name;

		context.dataDirectory = dataDirectory;
		context.syncNode = await setupLegacySyncNode(dataDirectory);
	});

	afterEach(async ({ syncNode, dataDirectory }) => {
		await verifyLegacyNodeIntegrity(assert, syncNode, dataDirectory);
	});

	const getKeyPair = async (app: Contracts.Kernel.Application, mnemonic: string) =>
		app
			.getTagged<Contracts.Crypto.KeyPairFactory>(
				Identifiers.Cryptography.Identity.KeyPair.Factory,
				"type",
				"wallet",
			)
			.fromMnemonic(mnemonic);

	it("should be ok", async ({ syncNode }) => {
		await Utils.waitBlock({ app: syncNode }, 5);
	});

	it("should be ok with transfer from legacy wallet", async ({ syncNode }) => {
		const wallets = await getWallets(syncNode);

		const mnemonic = "this is a top secret passphrase";
		// base58: D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib
		// pub: 034151a3ec46b5670a682b0a63394f863587d1bc97483b1b6c70eb58e7f0aed192
		// priv: 814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2

		const legacyWalletKeyPair = await syncNode
			.getTagged<Contracts.Crypto.KeyPairFactory>(
				Identifiers.Cryptography.Identity.KeyPair.Factory,
				"type",
				"wallet",
			)
			.fromMnemonic(mnemonic);

		// const legacyWalletAddress = await syncNode.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
		//     .fromPublicKey(legacyWalletKeyPair.publicKey);

		// console.log(legacyWalletAddress, legacyWalletKeyPair);

		const context = { app: syncNode, wallets };
		const randomWallet = await Utils.getRandomColdWallet(context);
		const randomWallet2 = await Utils.getRandomColdWallet(context);

		// Send legacy funds to a new wallet
		const txFromLegacyWallet = await EvmCalls.makeEvmCall(context, {
			sender: legacyWalletKeyPair,
			recipient: randomWallet.address,
			value: parseEther("0.001"),
		});
		assert.true(await forgeTransactions(context, [txFromLegacyWallet]));

		// Spent funds
		const txFromReceivedLegacyFunds = await EvmCalls.makeEvmCall(context, {
			sender: randomWallet.keyPair,
			recipient: randomWallet2.address,
			value: parseEther("0.0005"),
		});
		assert.true(await forgeTransactions(context, [txFromReceivedLegacyFunds]));
	});

	it("should merge a legacy cold wallet", async ({ syncNode }) => {
		const context = { app: syncNode, wallets: await getWallets(syncNode) };
		const sender = await getKeyPair(syncNode, COLD_WALLET.mnemonic);
		const recipient = await Utils.getRandomColdWallet(context);

		assert.undefined(await getApiRow(syncNode, "wallets", COLD_WALLET.address));
		assert.null(
			(await getApiRow(syncNode, "legacy_cold_wallets", COLD_WALLET.legacyAddress))!.merge_info_wallet_address,
		);

		const mergeTx = await EvmCalls.makeEvmCall(context, {
			recipient: recipient.address,
			sender,
			value: parseEther("1"),
		});
		assert.true(await forgeTransactions(context, [mergeTx]));

		// A later transaction updates the merged wallet again.
		const spendTx = await EvmCalls.makeEvmCall(context, {
			recipient: recipient.address,
			sender,
			value: parseEther("1"),
		});
		assert.true(await forgeTransactions(context, [spendTx]));

		const coldWallet = await getApiRow(syncNode, "legacy_cold_wallets", COLD_WALLET.legacyAddress);
		assert.equal(coldWallet!.merge_info_wallet_address, COLD_WALLET.address);
		assert.equal(coldWallet!.merge_info_transaction_hash, `0x${mergeTx.hash}`);

		const wallet = await getApiRow(syncNode, "wallets", COLD_WALLET.address);
		assert.equal(wallet!.attributes, {
			isLegacy: true,
			legacyMerge: { address: COLD_WALLET.legacyAddress, txHash: `0x${mergeTx.hash}` },
			legacyNonce: "0",
		});
	});

	it("should merge a legacy cold wallet into a funded wallet", async ({ syncNode }) => {
		const context = { app: syncNode, wallets: await getWallets(syncNode) };
		const recipient = await Utils.getRandomColdWallet(context);

		const fundingTx = await EvmCalls.makeEvmCall(context, {
			recipient: FUNDED_COLD_WALLET.address,
			sender: await getKeyPair(syncNode, LEGACY_WALLET),
			value: parseEther("0.001"),
		});
		assert.true(await forgeTransactions(context, [fundingTx]));

		assert.equal((await getApiRow(syncNode, "wallets", FUNDED_COLD_WALLET.address))!.attributes, {});

		const mergeTx = await EvmCalls.makeEvmCall(context, {
			recipient: recipient.address,
			sender: await getKeyPair(syncNode, FUNDED_COLD_WALLET.mnemonic),
			value: parseEther("1"),
		});
		assert.true(await forgeTransactions(context, [mergeTx]));

		const coldWallet = await getApiRow(syncNode, "legacy_cold_wallets", FUNDED_COLD_WALLET.legacyAddress);
		assert.equal(coldWallet!.merge_info_wallet_address, FUNDED_COLD_WALLET.address);

		const wallet = await getApiRow(syncNode, "wallets", FUNDED_COLD_WALLET.address);
		assert.equal(wallet!.attributes, {
			isLegacy: true,
			legacyMerge: { address: FUNDED_COLD_WALLET.legacyAddress, txHash: `0x${mergeTx.hash}` },
			legacyNonce: "0",
		});
	});

	it("should keep the legacy attributes of updated legacy wallets", async ({ syncNode }) => {
		const context = { app: syncNode, wallets: await getWallets(syncNode) };
		const sender = await getKeyPair(syncNode, LEGACY_WALLET);

		const multiSignatureWallet = await getApiRow(syncNode, "wallets", MULTI_SIGNATURE_WALLET);
		assert.true(multiSignatureWallet!.attributes.isLegacy);
		assert.equal(multiSignatureWallet!.attributes.multiSignature.min, 2);

		const secondSignatureWallet = await getApiRow(syncNode, "wallets", SECOND_SIGNATURE_WALLET);
		assert.true(secondSignatureWallet!.attributes.isLegacy);
		assert.string(secondSignatureWallet!.attributes.secondPublicKey);

		for (const recipient of [MULTI_SIGNATURE_WALLET, SECOND_SIGNATURE_WALLET]) {
			const transferTx = await EvmCalls.makeEvmCall(context, { recipient, sender, value: parseEther("0.001") });
			assert.true(await forgeTransactions(context, [transferTx]));
		}

		assert.equal(
			(await getApiRow(syncNode, "wallets", MULTI_SIGNATURE_WALLET))!.attributes,
			multiSignatureWallet!.attributes,
		);
		assert.equal(
			(await getApiRow(syncNode, "wallets", SECOND_SIGNATURE_WALLET))!.attributes,
			secondSignatureWallet!.attributes,
		);
	});
});
