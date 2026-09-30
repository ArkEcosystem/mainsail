import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { TransactionSchemaError } from "@mainsail/exceptions";

import { Serialized, Transactions, Storage, Json, wallet } from "../test/fixtures/index.js";
import { signTransfer, signUntilLeadingZeroRS } from "../test/helpers/canonical-transaction";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";

// secp256k1 group order (n). Every signature (r, s, v) has a malleable twin (r, n − s, v ^ 1)
// that recovers the same public key but carries a high S value (s > n/2).
const SECP256K1_ORDER = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141");

const malleate = (transaction: Contracts.Crypto.TransactionData): Contracts.Crypto.TransactionData => ({
	...transaction,
	s: (SECP256K1_ORDER - BigInt(`0x${transaction.s}`)).toString(16).padStart(64, "0"),
	v: transaction.v ^ 1,
});

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

			const { serialized: _, ...transactionData } = transaction;
			assert.equal(tx.toData(), transactionData);
		}
	});

	it("fromHex - should deserialize well-formed transactions", async ({ factory }) => {
		for (const [serialized, transaction] of [
			[Serialized.transactionTransfer, Transactions.transactionTransfer],
			[Serialized.transactionContractCall, Transactions.transactionContractCall],
			[
				Serialized.transactionContractCallWithSecondSignature,
				Transactions.transactionContractCallWithSecondSignature,
			],
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

	it("fromHex - should accept an externally-signed transaction with stripped (minimal-RLP) r/s", async ({
		app,
		factory,
		serializer,
	}) => {
		// Sign until a signature has a leading zero byte in r or s (~1 in 128), so the standard
		// minimal-RLP encoding a canonical Ethereum wallet emits is shorter than 32 bytes.
		const canonical = await signUntilLeadingZeroRS(app);

		// The serialized wire form is now minimal-RLP — byte-identical to a canonical Ethereum
		// wallet's, so at least one of r/s is under 32 bytes on the wire.
		const wireHex = (await serializer.serialize(canonical)).toString("hex");

		// Before the deserializer left-pad, this rejected: the 63-byte r||s buffer made recovery
		// throw and the sub-64-hex r/s failed the schema.
		const transaction = await factory.fromHex(wireHex);

		// The stripped wire r/s are normalized back to 32 bytes, the correct sender is recovered,
		// and the hash equals the one computed at signing time (the standard Ethereum hash).
		assert.equal(transaction.r, canonical.r);
		assert.equal(transaction.s, canonical.s);
		assert.equal(transaction.r.length, 64);
		assert.equal(transaction.s.length, 64);
		assert.equal(transaction.from, wallet.address);
		assert.equal(transaction.hash, canonical.hash);
	});

	it("fromHex - should reject a non-canonical (high S) signature", async ({ app, factory, serializer }) => {
		const canonical = await signTransfer(app);

		// The low-S original is accepted.
		const wireHex = (await serializer.serialize(canonical)).toString("hex");
		await assert.resolves(async () => factory.fromHex(wireHex));

		// The high-S twin survives the deserializer (r/s are still in [1, n) and minimal-RLP)
		// and would recover the same sender — it must be rejected by the low-S check.
		const malleatedWireHex = (await serializer.serialize(malleate(canonical))).toString("hex");
		await assert.rejects(
			async () => factory.fromHex(malleatedWireHex),
			"Failed to deserialize transaction, encountered invalid bytes: non-canonical signature (high S value)",
		);
	});

	it("computeCryptoData - should reject a non-canonical (high S) signature", async ({ app, factory }) => {
		const canonical = await signTransfer(app);

		const cryptoData = await factory.computeCryptoData(canonical);
		assert.equal(cryptoData.from, wallet.address);

		await assert.rejects(
			async () => factory.computeCryptoData(malleate(canonical)),
			"non-canonical signature (high S value)",
		);
	});

	it("fromHex - should reject transaction with schema errors", async ({ factory, serializer }) => {
		const serialized = await serializer.serialize({
			...Transactions.transactionTransfer,
			v: 2,
		});

		await assert.rejects(async () => factory.fromHex(serialized.toString("hex")), TransactionSchemaError);
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

	it("fromPoolData - should deserialize well-formed transaction", async ({ factory }) => {
		for (const transaction of [
			Transactions.transactionTransfer,
			Transactions.transactionContractCall,
			Transactions.transactionContractCallWithSecondSignature,
			Transactions.transactionDeploy,
		]) {
			const original = await factory.fromBytes(transaction.serialized);
			const fromPool = await factory.fromPoolData(original.toData());

			assert.equal(fromPool.hash, original.hash);
			assert.equal(fromPool.from, original.from);
			assert.equal(fromPool.to, original.to);
			assert.equal(fromPool.senderPublicKey, original.senderPublicKey);
			assert.equal(fromPool.senderLegacyAddress, original.senderLegacyAddress);
			assert.true(fromPool.serialized.equals(original.serialized));
			assert.equal(fromPool.toData(), original.toData());
		}
	});

	it("fromStorage - should deserialize well-formed transaction", async ({ factory }) => {
		for (const [storage, transaction] of [
			[Storage.transactionTransfer, Transactions.transactionTransfer],
			[Storage.transactionContractCall, Transactions.transactionContractCall],
			[
				Storage.transactionContractCallWithSecondSignature,
				Transactions.transactionContractCallWithSecondSignature,
			],
			[Storage.transactionDeploy, Transactions.transactionDeploy],
		]) {
			const tx = await factory.fromStorage(storage);
			assert.equal(tx.serialized, transaction.serialized);

			const { serialized: _, ...transactionData } = transaction;
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
			[
				Transactions.transactionContractCallWithSecondSignature,
				Transactions.transactionContractCallWithSecondSignature,
			],
			[Transactions.transactionDeploy, Transactions.transactionDeploy],
		]) {
			const tx = await factory.fromData(data);
			assert.equal(tx.serialized, transaction.serialized);

			const { serialized: _, ...transactionData } = transaction;
			assert.equal(tx.toData(), transactionData);
		}
	});

	it("fromData - should throw if schema is invalid", async ({ factory }) => {
		await assert.rejects(
			() => factory.fromData({ ...Transactions.transactionTransfer, value: "invalid" } as any),
			TransactionSchemaError,
		);
	});
});
