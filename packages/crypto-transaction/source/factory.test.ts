import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import {
	serializedTransactionContractCall,
	serializedTransactionContractCallWithSecondSignature,
	serializedTransactionDeploy,
	serializedTransactionTransfer,
	transactionTransfer,
} from "../test/fixtures/transaction.js";
import { Serialized, Transactions, Storage } from "../test/fixtures/index.js";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";

describe<{
	app: Application;
	factory: Contracts.Crypto.TransactionFactory;
}>("Factory", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.factory = context.app.get<Contracts.Crypto.TransactionFactory>(
			Identifiers.Cryptography.Transaction.Factory,
		);
	});

	it("fromJson - should deserialize well-formed transaction", async ({ factory }) => {
		const tx = await factory.fromJson(transactionTransfer);
		assert.equal(tx.serialized, Buffer.from(serializedTransactionTransfer, "hex"));
	});

	it("fromHex - should deserialize well-formed transactions", async ({ factory }) => {
		for (const [serialized, transaction] of [
			[Serialized.transactionTransfer, Transactions.transactionTransfer],
			[Serialized.transactionContractCall, Transactions.transactionContractCall],
			[Serialized.transactionContractCallWithSecondSignature, Transactions.transactionContractCallWithSecondSignature],
			[Serialized.transactionDeploy, Transactions.transactionDeploy],
		]) {
			const tx = await factory.fromHex(serialized);

			assert.equal(tx.serialized, transaction.serialized);
			assert.equal({ ...tx.toData(), serialized: undefined }, { ...transaction, serialized: undefined });
		}
	});

	it("fromHex - should reject transaction with trailing bytes", async ({ factory }) => {
		for (const hex of ["00", "01", "deadbeef", "aaaaaaaaaaaaaaaa", "0".repeat(255)]) {
			const serializedWithTrailingBytes = serializedTransactionTransfer + hex;
			await assert.rejects(
				async () => factory.fromHex(serializedWithTrailingBytes),
				"Failed to deserialize transaction, encountered invalid bytes: decoded RLP contains trailing bytes",
			);
		}
	});

	it("fromHex - should reject transaction with leading bytes", async ({ factory }) => {
		for (const hex of ["00", "01", "430123231", "aaaaaaaaaaaaaaaa", "0".repeat(255)]) {
			const serializedWithTrailingBytes = hex + serializedTransactionTransfer;
			await assert.rejects(
				async () => factory.fromHex(serializedWithTrailingBytes),
				"Failed to deserialize transaction, encountered invalid bytes: decode RLP not a list",
			);
		}
	});

	it("fromBytes - should deserialize well-formed transactions", async ({ factory }) => {
		for (const serialized of [
			serializedTransactionTransfer,
			serializedTransactionContractCall,
			serializedTransactionContractCallWithSecondSignature,
			serializedTransactionDeploy,
		]) {
			await assert.resolves(async () => factory.fromBytes(Buffer.from(serialized, "hex")));
		}
	});

	it("fromStorage - should deserialize well-formed transaction", async ({ factory }) => {
		for (const [storage, transaction] of [
			[Storage.transactionTransfer, Transactions.transactionTransfer],
			[Storage.transactionContractCall, Transactions.transactionContractCall],
			[Storage.transactionContractCallWithSecondSignature, Transactions.transactionContractCallWithSecondSignature],
			[Storage.transactionDeploy, Transactions.transactionDeploy],
		]) {
			const tx = await factory.fromStorage(storage);
			assert.equal(tx.serialized, transaction.serialized);

			const {  serialized: _, ...transactionData } = transaction;
			assert.equal(tx.toData(), transactionData);

			assert.equal(tx.blockHash, storage.blockHash);
			assert.equal(tx.blockNumber, storage.blockNumber);
			assert.equal(tx.transactionIndex, storage.index);
		}
	});

	it("fromData - should be ok", async ({ factory }) => {
		const transaction = await factory.fromData((await factory.fromJson(transactionTransfer)));
		assert.equal(transaction.serialized.toString("hex"), serializedTransactionTransfer);
	});
});
