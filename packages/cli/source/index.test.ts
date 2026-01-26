import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ assert, it }) => {
	it("should export ActionFactory", () => {
		assert.defined(index.ActionFactory);
	});

	it("should export Actions", () => {
		assert.defined(index.Actions);
	});

	it("should export Application", () => {
		assert.defined(index.Application);
	});

	it("should export ApplicationFactory", () => {
		assert.defined(index.ApplicationFactory);
	});

	it("should export Commands", () => {
		assert.defined(index.Commands);
	});

	it("should export Components", () => {
		assert.defined(index.Components);
	});

	it("should export ComponentFactory", () => {
		assert.defined(index.ComponentFactory);
	});

	it("should export Input", () => {
		assert.defined(index.Input);
	});

	it("should export Output", () => {
		assert.defined(index.Output);
	});

	it("should export Plugins", () => {
		assert.defined(index.Plugins);
	});

	it("should export Services", () => {
		assert.defined(index.Services);
	});

	it("should export Console", () => {
		assert.defined(index.Console);
	});

	it("should export Utils", () => {
		assert.defined(index.Utils);
	});
});
