import { Container } from "@arkecosystem/core-cli";
import { Console, describe } from "@arkecosystem/core-test-framework";
import fs from "fs-extra";
import { dirSync, setGracefulCleanup } from "tmp";

import { Command } from "./config-publish";

describe<{
	cli: Console;
}>("ConfigPublishCommand", ({ beforeEach, afterAll, it, assert, stub, spy }) => {
	beforeEach((context) => {
		process.env.CORE_PATH_CONFIG = dirSync().name;

		context.cli = new Console();
	});

	afterAll(() => setGracefulCleanup());

	it.skip("should throw if the network is invalid", async ({ cli }) => {
		await assert.rejects(
			() => cli.withFlags({ network: "invalid" }).execute(Command),
			'"network" must be one of [devnet, mainnet, testnet]',
		);
	});

	it("should throw if the destination already exists", async ({ cli }) => {
		stub(fs, "existsSync").returnValueOnce(true);

		await assert.rejects(
			() => cli.execute(Command),
			"Please use the --reset flag if you wish to reset your configuration.",
		);
	});

	it("should throw if the configuration files cannot be found", async ({ cli }) => {
		stub(fs, "existsSync").returnValue(false);

		await assert.rejects(() => cli.execute(Command), "Couldn't find the core configuration files");
	});

	it("should throw if the environment file cannot be found", async ({ cli }) => {
		const responseValues = [false, true, false];
		stub(fs, "existsSync").callsFake(() => responseValues.shift());

		const spyEnsure = spy(fs, "ensureDirSync");

		await assert.rejects(() => cli.execute(Command), "Couldn't find the environment file");

		spyEnsure.calledOnce();
	});

	it("should publish the configuration", async ({ cli }) => {
		const responseValues = [false, true, true];
		stub(fs, "existsSync").callsFake(() => responseValues.shift());

		const spyEnsure = spy(fs, "ensureDirSync");
		const spyCopy = spy(fs, "copySync");

		await cli.execute(Command);

		spyEnsure.calledOnce();
		spyCopy.calledTimes(2);
	});

	it("should reset the configuration", async ({ cli }) => {
		const responseValues = [false, true, true];
		stub(fs, "existsSync").callsFake(() => responseValues.shift());

		const spyRemove = spy(fs, "removeSync");
		const spyEnsure = spy(fs, "ensureDirSync");
		const spyCopy = spy(fs, "copySync");

		await cli.withFlags({ reset: true }).execute(Command);

		spyRemove.calledOnce();
		spyEnsure.calledOnce();
		spyCopy.calledTimes(2);
	});

	it("should publish the configuration via prompt", async ({ cli }) => {
		const responseValues = [false, true, true];
		stub(fs, "existsSync").callsFake(() => responseValues.shift());

		const spyEnsure = spy(fs, "ensureDirSync");
		const spyCopy = spy(fs, "copySync");

		stub(cli.app.get(Container.Identifiers.Prompt), "render").returnValue({
			confirm: true,
			network: "mainnet",
		});

		await cli.execute(Command);

		spyEnsure.calledOnce();
		spyCopy.calledTimes(2);
	});

	it("should throw if no network is selected via prompt", async ({ cli }) => {
		const responseValues = [false, true, true];
		stub(fs, "existsSync").callsFake(() => responseValues.shift());

		const spyEnsure = spy(fs, "ensureDirSync");
		const spyCopy = spy(fs, "copySync");

		stub(cli.app.get(Container.Identifiers.Prompt), "render").returnValue({
			confirm: true,
			network: undefined,
		});

		await assert.rejects(
			() => cli.withFlags({ network: undefined }).execute(Command),
			"You'll need to select the network to continue.",
		);

		spyEnsure.neverCalled();
		spyCopy.neverCalled();
	});

	it("should throw if the selected network is invalid via prompt", async ({ cli }) => {
		const responseValues = [false, true, true];
		stub(fs, "existsSync").callsFake(() => responseValues.shift());

		const spyEnsure = spy(fs, "ensureDirSync");
		const spyCopy = spy(fs, "copySync");

		stub(cli.app.get(Container.Identifiers.Prompt), "render").returnValue({
			confirm: false,
			network: "mainnet",
		});

		await assert.rejects(
			() => cli.withFlags({ network: undefined }).execute(Command),
			"You'll need to confirm the network to continue.",
		);

		spyEnsure.neverCalled();
		spyCopy.neverCalled();
	});

	it.skip("should publish the configuration via prompt without flag set before", async ({ cli }) => {
		const responseValues = [false, true, true];
		stub(fs, "existsSync").callsFake(() => responseValues.shift());

		const spyEnsure = spy(fs, "ensureDirSync");
		const spyCopy = spy(fs, "copySync");

		stub(cli.app.get(Container.Identifiers.Prompt), "render").returnValue({
			confirm: true,
			network: "mainnet",
		});

		await cli.withFlags({ network: undefined }).execute(Command);

		spyEnsure.calledOnce();
		spyCopy.calledTimes(2);
	});
});
