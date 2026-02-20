import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { blockData, blockDataWithTransactions, serialized, serializedWithTransactions } from "../test/fixtures/block";
import { assertBlockData, assertTransactionData } from "../test/helpers/asserts";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Deserializer } from "./deserializer";
import { Serializer } from "./serializer";
import { InvalidBlockBytesError } from "@mainsail/exceptions";

describe<{
	app: Application;
	deserializer: Deserializer;
	serializer: Serializer;
}>("Deserializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);
		context.deserializer = context.app.resolve(Deserializer);
		context.serializer = context.app.resolve(Serializer);
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

	it("#deserializeWithTransactions - should throw with trailing bytes", async ({ deserializer, serializer }) => {
		const deserialized = await deserializer.deserializeWithTransactions(Buffer.from(serialized, "hex"));

		for (const hex of ["00", "01", "43012323", "aa", "0".repeat(256)]) {
			const data = {
				...deserialized.data,
				payloadSize: deserialized.data.payloadSize + hex.length / 2, // each byte is represented by 2 hex characters
			}

			const serializedAltered = (await serializer.serializeWithTransactions({ ...data, transactions: deserialized.transactions })).toString("hex");
			const buff = Buffer.from(serializedAltered.slice(0, serializedAltered.length - hex.length) + hex, "hex");

			// Header can't detect it, because the payload size is correct
			await assert.resolves(() => deserializer.deserializeHeader(buff));

			await assert.rejects(
				() => deserializer.deserializeWithTransactions(buff),
				`Found trailing bytes of length ${hex.length / 2}`,
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
