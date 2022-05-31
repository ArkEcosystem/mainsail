import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { ServiceProvider as CoreCryptoAddressBeach32m } from "@arkecosystem/core-crypto-address-bech32m";
import { ServiceProvider as CoreCryptoBlock } from "@arkecosystem/core-crypto-block";
import { ServiceProvider as CoreCryptoConfig } from "@arkecosystem/core-crypto-config";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@arkecosystem/core-crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairSchnorr } from "@arkecosystem/core-crypto-key-pair-schnorr";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "@arkecosystem/core-crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoTransaction } from "@arkecosystem/core-crypto-transaction";
import { ServiceProvider as CoreCryptoTransactionTransfer } from "@arkecosystem/core-crypto-transaction-transfer";
import { ServiceProvider as CoreCryptoValidation } from "@arkecosystem/core-crypto-validation";
import { ServiceProvider as CoreFees } from "@arkecosystem/core-fees";
import { ServiceProvider as CoreFeesStatic } from "@arkecosystem/core-fees-static";
import { ServiceProvider as CoreLmdb } from "@arkecosystem/core-lmdb";
import { ServiceProvider as CoreSerializer } from "@arkecosystem/core-serializer";
import { ServiceProvider as CoreValidation } from "@arkecosystem/core-validation";
import { BigNumber } from "@arkecosystem/utils";
import lmdb from "lmdb";
import { dirSync, setGracefulCleanup } from "tmp";

import cryptoJson from "../../core/bin/config/testnet/crypto.json";
import { describe, Factories, Sandbox } from "../../core-test-framework";
import { DatabaseService } from "./database-service";
import { ServiceProvider as CoreDatabase } from "./index";

const generateBlock = async (): Promise<Contracts.Crypto.IBlock> => {
	const blockFactory = await Factories.factory("Block", cryptoJson);
	return blockFactory.withOptions({ transactionsCount: 2 }).make<Contracts.Crypto.IBlock>();
};

const generateBlocks = async (count: number): Promise<Contracts.Crypto.IBlock[]> => {
	const blocks = [];

	const blockFactory = await Factories.factory("Block", cryptoJson);
	let previousBlock = await blockFactory.make<Contracts.Crypto.IBlock>();

	blocks.push(previousBlock);

	for (let index = 0; index < count - 1; index++) {
		previousBlock = await blockFactory
			.withOptions({ getPreviousBlock: () => previousBlock.data, transactionsCount: 2 })
			.make<Contracts.Crypto.IBlock>();
		blocks.push(previousBlock);
	}

	return blocks;
};

const assertTransactionData = (assert, transactionData1, transactionData2) => {
	const transactionFields = ["id", "type", "senderPublicKey", "fee", "amount", "recipientId", "signature"];

	for (const field of transactionFields) {
		assert.equal(transactionData1[field].toString(), transactionData2[field].toString());
	}
};

const makeWallets = async (count: number, round: number): Promise<Contracts.State.Wallet[]> => {
	const wallets = [];

	const walletFactory = await Factories.factory("Wallet", cryptoJson);

	for (let index = 0; index < count; index++) {
		const wallet = await walletFactory.make<Contracts.State.Wallet>();

		wallet.setAttribute("validator.round", round);
		wallet.setAttribute("validator.voteBalance", BigNumber.ONE);

		wallets.push(wallet);
	}

	return wallets;
};

describe<{
	sandbox: Sandbox;
	databaseService: DatabaseService;
}>("DatabaseService", ({ beforeAll, beforeEach, it, assert, spy }) => {
	beforeAll(() => {
		setGracefulCleanup();
	});

	beforeEach(async (context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.useDataPath(dirSync().name);

		context.sandbox.app.bind(Identifiers.LogService).toConstantValue({
			info: () => {},
		});

		await context.sandbox.app.resolve(CoreCryptoConfig).register();
		await context.sandbox.app.resolve(CoreValidation).register();
		await context.sandbox.app.resolve(CoreCryptoValidation).register();
		await context.sandbox.app.resolve(CoreCryptoKeyPairSchnorr).register();
		await context.sandbox.app.resolve(CoreCryptoSignatureSchnorr).register();
		await context.sandbox.app.resolve(CoreCryptoAddressBeach32m).register();
		await context.sandbox.app.resolve(CoreSerializer).register();
		await context.sandbox.app.resolve(CoreCryptoHashBcrypto).register();
		await context.sandbox.app.resolve(CoreFees).register();
		await context.sandbox.app.resolve(CoreFeesStatic).register();
		await context.sandbox.app.resolve(CoreCryptoTransaction).register();
		await context.sandbox.app.resolve(CoreCryptoTransactionTransfer).register();
		await context.sandbox.app.resolve(CoreCryptoBlock).register();
		await context.sandbox.app.resolve(CoreLmdb).register();
		await context.sandbox.app.resolve(CoreDatabase).register();

		context.sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.setConfig(cryptoJson);

		context.databaseService = context.sandbox.app.get<DatabaseService>(Identifiers.Database.Service);
	});

	it("#saveBlocks - should save a block", async ({ databaseService, sandbox }) => {
		const spyOnBlockStoreagePut = spy(sandbox.app.get<lmdb.Database>(Identifiers.Database.BlockStorage), "put");
		const spyOnBlockHeightStoreagePut = spy(
			sandbox.app.get<lmdb.Database>(Identifiers.Database.BlockHeightStorage),
			"put",
		);
		const spyOnTransactionStoragePut = spy(
			sandbox.app.get<lmdb.Database>(Identifiers.Database.TransactionStorage),
			"put",
		);

		const block = await generateBlock();

		await databaseService.saveBlocks([block]);

		spyOnBlockStoreagePut.calledOnce();
		spyOnBlockHeightStoreagePut.calledOnce();
		spyOnTransactionStoragePut.calledTimes(2);

		assert.equal(sandbox.app.get<lmdb.Database>(Identifiers.Database.BlockStorage).getKeysCount(), 1);
		assert.equal(sandbox.app.get<lmdb.Database>(Identifiers.Database.BlockHeightStorage).getKeysCount(), 1);
		assert.equal(sandbox.app.get<lmdb.Database>(Identifiers.Database.TransactionStorage).getKeysCount(), 2);
	});

	it("#saveBlocks - should save a block only once", async ({ databaseService, sandbox }) => {
		const spyOnBlockStoreagePut = spy(sandbox.app.get<lmdb.Database>(Identifiers.Database.BlockStorage), "put");
		const spyOnBlockHeightStoreagePut = spy(
			sandbox.app.get<lmdb.Database>(Identifiers.Database.BlockHeightStorage),
			"put",
		);
		const spyOnTransactionStoragePut = spy(
			sandbox.app.get<lmdb.Database>(Identifiers.Database.TransactionStorage),
			"put",
		);

		const block = await generateBlock();

		await databaseService.saveBlocks([block, block]);

		spyOnBlockStoreagePut.calledTimes(1);
		spyOnBlockHeightStoreagePut.calledTimes(1);
		spyOnTransactionStoragePut.calledTimes(2);

		assert.equal(sandbox.app.get<lmdb.Database>(Identifiers.Database.BlockStorage).getKeysCount(), 1);
		assert.equal(sandbox.app.get<lmdb.Database>(Identifiers.Database.BlockHeightStorage).getKeysCount(), 1);
		assert.equal(sandbox.app.get<lmdb.Database>(Identifiers.Database.TransactionStorage).getKeysCount(), 2);
	});

	it("#saveBlocks - should fail to save block without id", async ({ databaseService }) => {
		await assert.rejects(
			() =>
				databaseService.saveBlocks([
					{
						// @ts-ignore
						data: {
							height: 1,
							id: undefined,
						},
					},
				]),
			"Failed to store block 1 because it has no ID.",
		);
	});

	it("#getBlock - should return undefined if block doesn't exists", async ({ databaseService }) => {
		assert.undefined(await databaseService.getBlock("undefined"));
	});

	it("#getBlock - should return block by id", async ({ databaseService }) => {
		const blockFactory = await Factories.factory("Block", cryptoJson);
		const block = await blockFactory.withOptions({ transactionsCount: 2 }).make<Contracts.Crypto.IBlock>();

		await databaseService.saveBlocks([block]);

		assert.equal(await databaseService.getBlock(block.data.id), block);
	});

	it("#findBlocksByHeightRange - should return empty array if blocks are not found", async ({ databaseService }) => {
		await databaseService.saveBlocks(await generateBlocks(3));

		assert.equal(await databaseService.findBlocksByHeightRange(5, 10), []);
	});

	it("#findBlocksByHeightRange - should return blocks by height", async ({ databaseService }) => {
		const blocks = await generateBlocks(4);
		await databaseService.saveBlocks(blocks);

		assert.equal(await databaseService.findBlocksByHeightRange(2, 5), blocks);
	});

	it("#getBlocks - should return empty array if blocks are not found", async ({ databaseService }) => {
		await databaseService.saveBlocks(await generateBlocks(3));

		assert.equal(await databaseService.getBlocks(5, 10), []);
	});

	it("#getBlocks - should return block data by height", async ({ databaseService }) => {
		const blocks = await generateBlocks(4);
		await databaseService.saveBlocks(blocks);

		assert.equal(
			await databaseService.getBlocks(2, 5),
			blocks.map((block) => block.data),
		);
	});

	it("#getBlocksForDownload - should return empty array if blocks are not found", async ({ databaseService }) => {
		await databaseService.saveBlocks(await generateBlocks(3));

		assert.equal(await databaseService.getBlocksForDownload(5, 10), []);
	});

	it("#getBlocksForDownload - should return block data by height", async ({ databaseService }) => {
		const blocks = await generateBlocks(4);
		await databaseService.saveBlocks(blocks);

		assert.equal(
			await databaseService.getBlocksForDownload(2, 4),
			blocks.map((block) => ({
				...block.data,
				transactions: block.transactions.map(({ serialized }) => serialized.toString("hex")),
			})),
		);
	});

	it("#findBlockByHeights - should return empty array if blocks are not found", async ({ databaseService }) => {
		await databaseService.saveBlocks(await generateBlocks(3));

		assert.equal(await databaseService.findBlockByHeights([6, 7, 8]), []);
	});

	it("#findBlockByHeights - should return block data by height", async ({ databaseService }) => {
		const blocks = await generateBlocks(4);
		await databaseService.saveBlocks(blocks);

		assert.equal(await databaseService.findBlockByHeights([2, 3, 4, 5]), blocks);
	});

	it("#getLastBlock - should return undefined if block is not found", async ({ databaseService }) => {
		assert.undefined(await databaseService.getLastBlock());
	});

	it("#getLastBlock - should return last block", async ({ databaseService }) => {
		const blocks = await generateBlocks(4);
		await databaseService.saveBlocks(blocks);

		assert.equal(await databaseService.getLastBlock(), blocks[3]);
	});

	it("#getTransaction - should return undefined if block is not found", async ({ databaseService }) => {
		assert.undefined(await databaseService.getTransaction("transaction_id"));
	});

	it("#getLastBlock - should return last block", async ({ databaseService }) => {
		const block = await generateBlock();
		await databaseService.saveBlocks([block]);

		assertTransactionData(
			assert,
			(await databaseService.getTransaction(block.transactions[0].id)).data,
			block.transactions[0].data,
		);
	});

	it("#findBlocksByIds - should return empty array if blocks are not found", async ({ databaseService }) => {
		await databaseService.saveBlocks(await generateBlocks(3));

		assert.equal(await databaseService.findBlocksByIds(["id_1", "id_2", "id_3"]), []);
	});

	it("#findBlockByHeights - should return block data by ids", async ({ databaseService }) => {
		const blocks = await generateBlocks(4);
		await databaseService.saveBlocks(blocks);

		assert.equal(
			await databaseService.findBlocksByIds(blocks.map((block) => block.data.id)),
			blocks.map((block) => block.data),
		);
	});

	it("#saveRound - should save round", async ({ databaseService, sandbox }) => {
		const spyOnRoundStoragePut = spy(sandbox.app.get<lmdb.Database>(Identifiers.Database.RoundStorage), "put");

		const wallets = await makeWallets(3, 1);

		await databaseService.saveRound(wallets);

		spyOnRoundStoragePut.calledOnce();
		spyOnRoundStoragePut.calledWith(
			1,
			wallets.map((wallet) => ({
				balance: wallet.getAttribute("validator.voteBalance").toString(),
				publicKey: wallet.getPublicKey(),
				round: wallet.getAttribute("validator.round"),
			})),
		);
	});

	it("#saveRound - should not save round second time", async ({ databaseService, sandbox }) => {
		const spyOnRoundStoragePut = spy(sandbox.app.get<lmdb.Database>(Identifiers.Database.RoundStorage), "put");

		const wallets = await makeWallets(3, 1);

		await databaseService.saveRound(wallets);
		await databaseService.saveRound(wallets);

		spyOnRoundStoragePut.calledOnce();
	});

	it("#getRound - should return empty array if round is not stored", async ({ databaseService }) => {
		assert.equal(await databaseService.getRound(1), []);
	});

	it("#getRound - should return round", async ({ databaseService }) => {
		const wallets = await makeWallets(3, 1);
		await databaseService.saveRound(wallets);

		assert.equal(
			await databaseService.getRound(1),
			wallets
				.sort((a, b) => a.getPublicKey().localeCompare(b.getPublicKey()))
				.map((wallet) => ({
					balance: wallet.getAttribute("validator.voteBalance"),
					publicKey: wallet.getPublicKey(),
					round: wallet.getAttribute("validator.round"),
				})),
		);
	});

	it("#deleteRound - should do nothing if round is not stored", async ({ databaseService, sandbox }) => {
		const spyOnRoundStorageRemove = spy(
			sandbox.app.get<lmdb.Database>(Identifiers.Database.RoundStorage),
			"remove",
		);

		await databaseService.deleteRound(1);

		spyOnRoundStorageRemove.neverCalled();
	});

	it("#deleteRound - should delete all round higher or equal given round", async ({ databaseService, sandbox }) => {
		const spyOnRoundStorageRemove = spy(
			sandbox.app.get<lmdb.Database>(Identifiers.Database.RoundStorage),
			"remove",
		);

		await databaseService.saveRound(await makeWallets(3, 1));
		await databaseService.saveRound(await makeWallets(3, 2));
		await databaseService.saveRound(await makeWallets(3, 3));

		await databaseService.deleteRound(2);

		spyOnRoundStorageRemove.calledTimes(2);
		spyOnRoundStorageRemove.calledWith(2);
		spyOnRoundStorageRemove.calledWith(3);
	});

	it("#getForgedTransactionsIds - should return empty array if transaction ids are not found", async ({
		databaseService,
	}) => {
		assert.equal(await databaseService.getForgedTransactionsIds(["id_1", "id_2", "id_3"]), []);
	});

	it("#getForgedTransactionsIds - should return block data by ids", async ({ databaseService }) => {
		const block = await generateBlock();
		await databaseService.saveBlocks([block]);

		assert.equal(
			await databaseService.getForgedTransactionsIds(block.transactions.map((transaction) => transaction.id)),
			block.transactions.map((transaction) => transaction.id),
		);
	});
});
