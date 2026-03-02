import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ assert, it }) => {
	it("should export ServiceProvider", () => {
		assert.defined(index.ServiceProvider);
	});

	it("should export Nes", () => {
		assert.defined(index.Nes);
	});

	it("should export Peer", () => {
		assert.defined(index.PeerRepository);
	});

	it("should export Peer", () => {
		assert.defined(index.PeerRepository);
	});

	it("should export Service", () => {
		assert.defined(index.Service);
	});

	it("should export Codecs", () => {
		assert.defined(index.Codecs);
	});
});
