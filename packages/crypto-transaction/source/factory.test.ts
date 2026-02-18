import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import {
	TransactionSchemaError,
} from "@mainsail/exceptions";

import { Serialized, Transactions, Storage, Json } from "../test/fixtures/index.js";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";

describe<{
	app: Application;
	factory: Contracts.Crypto.TransactionFactory;
	serializer: Contracts.Crypto.TransactionSerializer;
}>("Factory", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.factory = context.app.get<Contracts.Crypto.TransactionFactory>(
			Identifiers.Cryptography.Transaction.Factory,
		);
		context.serializer = context.app.get<Contracts.Crypto.TransactionSerializer>(
			Identifiers.Cryptography.Transaction.Serializer,
		);
	});

	it("fromJson - should be ok", async ({ factory }) => {
		for (const [json, transaction] of [
			[Json.transactionTransfer, Transactions.transactionTransfer],
			[Json.transactionContractCall, Transactions.transactionContractCall],
			[Json.transactionContractCallWithSecondSignature, Transactions.transactionContractCallWithSecondSignature],
			[Json.transactionDeploy, Transactions.transactionDeploy],
		]) {
			const tx = await factory.fromJson(json);

			assert.equal(tx.serialized.toString("hex"), transaction.serialized.toString("hex"));

			const {  serialized: _, ...transactionData } = transaction;
			assert.equal(tx.toData(), transactionData);
		}
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
			const serializedWithTrailingBytes = Serialized.transactionTransfer + hex;
			await assert.rejects(
				async () => factory.fromHex(serializedWithTrailingBytes),
				"Failed to deserialize transaction, encountered invalid bytes: decoded RLP contains trailing bytes",
			);
		}
	});

	it("fromHex - should reject transaction with leading bytes", async ({ factory }) => {
		for (const hex of ["00", "01", "430123231", "aaaaaaaaaaaaaaaa", "0".repeat(255)]) {
			const serializedWithTrailingBytes = hex + Serialized.transactionTransfer;
			await assert.rejects(
				async () => factory.fromHex(serializedWithTrailingBytes),
				"Failed to deserialize transaction, encountered invalid bytes: decode RLP not a list",
			);
		}
	});

	it("fromHex - should reject transaction with leading bytes", async ({ factory }) => {
		for (const hex of ["00", "01", "430123231", "aaaaaaaaaaaaaaaa", "0".repeat(255)]) {
			const serializedWithTrailingBytes = hex + Serialized.transactionTransfer;
			await assert.rejects(
				async () => factory.fromHex(serializedWithTrailingBytes),
				"Failed to deserialize transaction, encountered invalid bytes: decode RLP not a list",
			);
		}
	});

	it("fromHex - should reject transaction with schema errors", async ({ factory, serializer }) => {
		const serialized = await serializer.serialize({
			...Transactions.transactionTransfer,
			v: 2,
		});

		await assert.rejects(
			async () => factory.fromHex(serialized.toString("hex")),
			TransactionSchemaError,
		);
	});

	it("fromBytes - should deserialize well-formed transactions", async ({ factory }) => {
		for (const serialized of [
			Serialized.transactionTransfer,
			Serialized.transactionContractCall,
			Serialized.transactionContractCallWithSecondSignature,
			Serialized.transactionDeploy,
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

	it("fromData - should deserialize well-formed transaction", async ({ factory }) => {
		for (const [data, transaction] of [
			[Transactions.transactionTransfer, Transactions.transactionTransfer],
			[Transactions.transactionContractCall, Transactions.transactionContractCall],
			[Transactions.transactionContractCallWithSecondSignature, Transactions.transactionContractCallWithSecondSignature],
			[Transactions.transactionDeploy, Transactions.transactionDeploy],
		]) {
			const tx = await factory.fromData(data);
			assert.equal(tx.serialized, transaction.serialized);

			const {  serialized: _, ...transactionData } = transaction;
			assert.equal(tx.toData(), transactionData);
		}
	});

	it("fromData - should throw if schema is invalid", async ({ factory }) => {
		await assert.rejects(() => factory.fromData({ ...Transactions.transactionTransfer, value: "invalid" } as any), TransactionSchemaError);
	});
});
