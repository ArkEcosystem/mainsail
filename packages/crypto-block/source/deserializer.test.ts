import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { blockData, blockDataWithTransactions, serialized, serializedWithTransactions } from "../test/fixtures/block";
import { assertBlockData, assertTransactionData } from "../test/helpers/asserts";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Deserializer } from "./deserializer";
import { InvalidBlockBytesError } from "@mainsail/exceptions";

describe<{
	app: Application;
	deserializer: Deserializer;
}>("Deserializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);
		context.deserializer = context.app.resolve(Deserializer);
	});

	it("#deserializeWithTransactions - should correctly deserialize a block", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeWithTransactions(Buffer.from(serialized, "hex"));

		assertBlockData(assert, deserialized.data, blockData);
		assert.equal(deserialized.transactions, []);
	});

	it("#deserializeWithTransactions - should correctly deserialize a block with transactions", async ({
		deserializer,
	}) => {
		const deserialized = await deserializer.deserializeWithTransactions(
			Buffer.from(serializedWithTransactions, "hex"),
		);

		assertBlockData(assert, deserialized.data, blockDataWithTransactions);

		assert.length(deserialized.transactions, blockDataWithTransactions.transactions.length);

		for (let index = 0; index < blockDataWithTransactions.transactions.length; index++) {
			assertTransactionData(
				assert,
				deserialized.transactions[index],
				blockDataWithTransactions.transactions[index],
			);
		}
	});

	it("#deserializeWithTransactions - should throw with trailing bytes", async ({ deserializer }) => {
		for (const hex of ["00", "01", "430123231", "aaaaaaaaaaaaaaaa", "0".repeat(255)]) {
			await assert.rejects(
				() => deserializer.deserializeWithTransactions(Buffer.from(serialized + hex, "hex")),
				InvalidBlockBytesError,
			);
		}
	});

	it("#deserializeWithTransactions - should throw with leading bytes", async ({ deserializer }) => {
		for (const hex of ["00", "01", "430123231", "aaaaaaaaaaaaaaaa", "0".repeat(255)]) {
			await assert.rejects(
				() => deserializer.deserializeWithTransactions(Buffer.from(hex + serialized, "hex")),
				InvalidBlockBytesError,
			);
		}
	});

	it("#deserializeHeader - should correctly deserialize without transactions", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeHeader(Buffer.from(serialized, "hex"));

		assertBlockData(assert, deserialized, blockData);
		assert.undefined(deserialized.transactions);
	});

	it("#deserializeHeader - should correctly deserialize with transactions", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeHeader(Buffer.from(serializedWithTransactions, "hex"));

		assertBlockData(assert, deserialized, blockDataWithTransactions);
		assert.undefined(deserialized.transactions);
	});

	it("#deserializeHeader - should throw with trailing bytes", async ({ deserializer }) => {
		for (const hex of ["00", "01", "430123231", "aaaaaaaaaaaaaaaa", "0".repeat(255)]) {
			await assert.rejects(
				() => deserializer.deserializeHeader(Buffer.from(serialized + hex, "hex")),
				InvalidBlockBytesError,
			);
		}
	});

	it("#deserializeHeader - should throw with leading bytes", async ({ deserializer }) => {
		for (const hex of ["00", "01", "430123231", "aaaaaaaaaaaaaaaa", "0".repeat(255)]) {
			await assert.rejects(
				() => deserializer.deserializeHeader(Buffer.from(hex + serialized, "hex")),
				InvalidBlockBytesError,
			);
		}
	});
});
