import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ assert, it }) => {
	it("should export ServiceProvider", () => {
		assert.defined(index.ServiceProvider);
	});

	it("should export TransactionBuilder", () => {
		assert.defined(index.TransactionBuilder);
	});

	it("should export Deserializer", () => {
		assert.defined(index.Deserializer);
	});

	it("should export TransactionFactory", () => {
		assert.defined(index.TransactionFactory);
	});

	it("should export Serializer", () => {
		assert.defined(index.Serializer);
	});

	it("should export Signer", () => {
		assert.defined(index.Signer);
	});

	it("should export Transaction", () => {
		assert.defined(index.Transaction);
	});

	it("should export Utils", () => {
		assert.defined(index.Utils);
	});

	it("should export Verifier", () => {
		assert.defined(index.Verifier);
	});

	it("should export makeKeywords", () => {
		assert.defined(index.makeKeywords);
	});

	it("should export schemas", () => {
		assert.defined(index.schemas);
	});
});
