import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ assert, it }) => {
	it("should export ServiceProvider", () => {
		assert.defined(index.ServiceProvider);
	});

	it("should export getBls", () => {
		assert.defined(index.getBls);
	});

	it("should export KeyPairFactory", () => {
		assert.defined(index.KeyPairFactory);
	});

	it("should export PrivateKeyFactory", () => {
		assert.defined(index.PrivateKeyFactory);
	});

	it("should export PublicKeyFactory", () => {
		assert.defined(index.PublicKeyFactory);
	});

	it("should export schemas", () => {
		assert.defined(index.schemas);
	});

	it("should export PublicKeySerializer", () => {
		assert.defined(index.PublicKeySerializer);
	});
});
