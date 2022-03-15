import { Console, describe } from "@arkecosystem/core-test-framework";
import fs from "fs-extra";
import prompts from "prompts";

import { Command } from "./pool-clear";

describe<{
	cli: Console;
}>("PoolClearCommand", ({ beforeEach, it, stub, assert }) => {
	beforeEach((context) => {
		context.cli = new Console();
	});

	it("should execute succesfully", async ({ cli }) => {
		const removeSync = stub(fs, "removeSync");
		stub(cli.app, "getCorePath").resolvedValue(null);

		prompts.inject([true]);

		await assert.resolves(() => cli.execute(Command));

		removeSync.calledOnce();
	});

	it("should throw any errors", async ({ cli }) => {
		const removeSync = stub(fs, "removeSync").callsFake(() => {
			throw new Error("Fake Error");
		});
		stub(cli.app, "getCorePath").resolvedValue(null);

		prompts.inject([true]);

		await assert.rejects(() => cli.execute(Command), "Fake Error");

		removeSync.calledOnce();
	});

	it("should do nothing when prompt confirmation is false", async ({ cli }) => {
		const removeSync = stub(fs, "removeSync");
		stub(cli.app, "getCorePath").resolvedValue(null);

		prompts.inject([false]);

		await assert.resolves(() => cli.execute(Command));

		removeSync.neverCalled();
	});

	it("should remove files using flags", async ({ cli }) => {
		const removeSync = stub(fs, "removeSync");
		stub(cli.app, "getCorePath").resolvedValue(null);

		await assert.resolves(() => cli.withFlags({ false: true }).execute(Command));

		removeSync.calledOnce();
	});
});
