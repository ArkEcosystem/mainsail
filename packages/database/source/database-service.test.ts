import { Contracts, Identifiers } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoAddressBeach32m } from "@mainsail/crypto-address-bech32m";
import { ServiceProvider as CoreCryptoBlock } from "@mainsail/crypto-block";
import { ServiceProvider as CoreCryptoConfig } from "@mainsail/crypto-config";
import { ServiceProvider as CoreCryptoConsensus } from "@mainsail/crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairSchnorr } from "@mainsail/crypto-key-pair-schnorr";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "@mainsail/crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";
import { ServiceProvider as CoreCryptoTransactionTransfer } from "@mainsail/crypto-transaction-transfer";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreFees } from "@mainsail/fees";
import { ServiceProvider as CoreFeesStatic } from "@mainsail/fees-static";
import { ServiceProvider as CoreSerializer } from "@mainsail/serializer";
import { ServiceProvider as CoreLmdb } from "@mainsail/storage-lmdb";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";
import lmdb from "lmdb";
import { dirSync, setGracefulCleanup } from "tmp";

import cryptoJson from "../../core/bin/config/testnet/mainsail/crypto.json";
import { describe, Factories, Sandbox } from "../../test-framework";
import { DatabaseService } from "./database-service";
import { ServiceProvider as CoreDatabase } from "./index";

const generateBlock = async (): Promise<Contracts.Crypto.ICommittedBlock> => {
	const blockFactory = await Factories.factory("Block", cryptoJson);

	return blockFactory.withOptions({ transactionsCount: 2 }).make<Contracts.Crypto.ICommittedBlock>();
};

const generateBlocks = async (count: number): Promise<Contracts.Crypto.ICommittedBlock[]> => {
	const blocks: Contracts.Crypto.ICommittedBlock[] = [];

	const blockFactory = await Factories.factory("Block", cryptoJson);
	let previousBlock = await blockFactory.make<Contracts.Crypto.ICommittedBlock>();

	blocks.push(previousBlock);

	for (let index = 0; index < count - 1; index++) {
		previousBlock = await blockFactory
			.withOptions({ getPreviousBlock: () => previousBlock.block.data, transactionsCount: 2 })
			.make<Contracts.Crypto.ICommittedBlock>();
		blocks.push(previousBlock);
	}

	return blocks;
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
		await context.sandbox.app.resolve(CoreCryptoConsensus).register();
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

		const block = await generateBlock();

		await databaseService.saveBlocks([block]);

		spyOnBlockStoreagePut.calledOnce();
		spyOnBlockHeightStoreagePut.calledOnce();

		assert.equal(sandbox.app.get<lmdb.Database>(Identifiers.Database.BlockStorage).getKeysCount(), 1);
		assert.equal(sandbox.app.get<lmdb.Database>(Identifiers.Database.BlockHeightStorage).getKeysCount(), 1);
	});

	it("#saveBlocks - should save a block only once", async ({ databaseService, sandbox }) => {
		const spyOnBlockStoreagePut = spy(sandbox.app.get<lmdb.Database>(Identifiers.Database.BlockStorage), "put");
		const spyOnBlockHeightStoreagePut = spy(
			sandbox.app.get<lmdb.Database>(Identifiers.Database.BlockHeightStorage),
			"put",
		);

		const block = await generateBlock();

		await databaseService.saveBlocks([block, block]);

		spyOnBlockStoreagePut.calledTimes(1);
		spyOnBlockHeightStoreagePut.calledTimes(1);

		assert.equal(sandbox.app.get<lmdb.Database>(Identifiers.Database.BlockStorage).getKeysCount(), 1);
		assert.equal(sandbox.app.get<lmdb.Database>(Identifiers.Database.BlockHeightStorage).getKeysCount(), 1);
	});

	it("#getBlock - should return undefined if block doesn't exists", async ({ databaseService }) => {
		assert.undefined(await databaseService.getBlock("undefined"));
	});

	it("#getBlock - should return block by id", async ({ databaseService }) => {
		const blockFactory = await Factories.factory("Block", cryptoJson);
		const block = await blockFactory.withOptions({ transactionsCount: 2 }).make<Contracts.Crypto.ICommittedBlock>();

		await databaseService.saveBlocks([block]);

		assert.equal(await databaseService.getBlock(block.block.data.id), block.block);
	});

	it("#findCommittedBlocks - should return empty array if blocks are not found", async ({ databaseService }) => {
		await databaseService.saveBlocks(await generateBlocks(3));

		assert.equal(await databaseService.findCommittedBlocks(5, 10), []);
	});

	it("#findCommittedBlocks - should return buffers", async ({ databaseService }) => {
		await databaseService.saveBlocks(await generateBlocks(4));

		const result = await databaseService.findCommittedBlocks(1, 4);
		assert.equal(result.length, 4);
		assert.instance(result[0], Buffer);
		assert.instance(result[1], Buffer);
		assert.instance(result[2], Buffer);
		assert.instance(result[3], Buffer);
	});

	it("#findBlocksByHeightRange - should return empty array if blocks are not found", async ({ databaseService }) => {
		await databaseService.saveBlocks(await generateBlocks(3));

		assert.equal(await databaseService.findBlocksByHeightRange(5, 10), []);
	});

	it("#findBlocksByHeightRange - should return blocks by height", async ({ databaseService }) => {
		const blocks = await generateBlocks(4);
		await databaseService.saveBlocks(blocks);

		assert.equal(
			await databaseService.findBlocksByHeightRange(1, 4),
			blocks.map(({ block }) => block),
		);
	});

	it("#getBlocks - should return empty array if blocks are not found", async ({ databaseService }) => {
		await databaseService.saveBlocks(await generateBlocks(3));

		assert.equal(await databaseService.getBlocks(5, 10), []);
	});

	it("#getBlocks - should return block data by height", async ({ databaseService }) => {
		const blocks = await generateBlocks(4);
		await databaseService.saveBlocks(blocks);

		assert.equal(
			await databaseService.getBlocks(1, 4),
			blocks.map((block) => block.block.data),
		);
	});

	it("#findBlockByHeights - should return empty array if blocks are not found", async ({ databaseService }) => {
		await databaseService.saveBlocks(await generateBlocks(3));

		assert.equal(await databaseService.findBlockByHeights([6, 7, 8]), []);
	});

	it("#findBlockByHeights - should return block data by height", async ({ databaseService }) => {
		const blocks = await generateBlocks(4);
		await databaseService.saveBlocks(blocks);

		assert.equal(
			await databaseService.findBlockByHeights([1, 2, 3, 4]),
			blocks.map(({ block }) => block),
		);
	});

	it("#getLastBlock - should return undefined if block is not found", async ({ databaseService }) => {
		assert.undefined(await databaseService.getLastBlock());
	});

	it("#getLastBlock - should return last block", async ({ databaseService }) => {
		const blocks = await generateBlocks(4);
		await databaseService.saveBlocks(blocks);

		assert.equal(await databaseService.getLastBlock(), blocks[3].block);
	});

	it("#findBlocksByIds - should return empty array if blocks are not found", async ({ databaseService }) => {
		await databaseService.saveBlocks(await generateBlocks(3));

		assert.equal(await databaseService.findBlocksByIds(["id_1", "id_2", "id_3"]), []);
	});

	it("#findBlockByHeights - should return block data by ids", async ({ databaseService }) => {
		const blocks = await generateBlocks(4);
		await databaseService.saveBlocks(blocks);

		assert.equal(
			await databaseService.findBlocksByIds(blocks.map(({ block }) => block.data.id)),
			blocks.map(({ block }) => block.data),
		);
	});
});
