import { Container } from "@arkecosystem/core-cli";
import { Console, describe } from "@arkecosystem/core-test-framework";
import { writeJSONSync } from "fs-extra";
import prompts from "prompts";
import { dirSync, setGracefulCleanup } from "tmp";

import { Command } from "./config-forger";

describe<{
	cli: Console;
}>("ConfigForgerCommand", ({ beforeEach, afterAll, it, assert, stub }) => {
	const password = "password";
	const bip39 = "clay harbor enemy utility margin pretty hub comic piece aerobic umbrella acquire";
	const bip39Flags = "venue below waste gather spin cruise title still boost mother flash tuna";
	const bip39Prompt = "craft imitate step mixture patch forest volcano business charge around girl confirm";

	beforeEach((context) => {
		process.env.CORE_PATH_CONFIG = dirSync().name;

		writeJSONSync(`${process.env.CORE_PATH_CONFIG}/delegates.json`, {});

		context.cli = new Console();
	});

	afterAll(() => {
		setGracefulCleanup();
	});

	it("should throw if no method is set", async ({ cli }) => {
		stub(cli.app.get(Container.Identifiers.Prompt), "render").returnValue({
			notMethod: "incorrect key",
		});

		await assert.rejects(
			() => cli.withFlags({ bip39: bip39Flags }).execute(Command),
			"Please enter valid data and try again!",
		);
	});

	it("should do nothing if the method is netierr bip39 or bip 38", async ({ cli }) => {
		stub(cli.app.get(Container.Identifiers.Prompt), "render").returnValue({
			method: "neither bip 38 or bip 39",
		});

		await assert.resolves(() => cli.withFlags({ bip39: bip39Flags }).execute(Command));
	});

	it("should configure from flags", async ({ cli }) => {
		stub(cli.app.get(Container.Identifiers.Prompt), "render").returnValue({
			method: "neither bip 38 or bip 39",
		});

		await assert.resolves(() => cli.withFlags({ bip39: bip39Flags }).execute(Command));
	});

	it("should configure bip38 from flags", async ({ cli }) => {
		stub(cli.app.get(Container.Identifiers.Prompt), "render").returnValue({
			bip39: bip39Prompt,
			confirm: true,
			password,
		});

		await assert.resolves(() => cli.withFlags({ bip39: bip39Flags, method: "bip38" }).execute(Command));
	});

	it("should configure bip39 from flags", async ({ cli }) => {
		stub(cli.app.get(Container.Identifiers.Prompt), "render").returnValue({
			bip39: bip39Prompt,
			confirm: true,
		});
		await assert.resolves(() => cli.withFlags({ bip39: bip39Flags, method: "bip39" }).execute(Command));
	});

	it("#BIP39Command - should configure from flags", async ({ cli }) => {
		prompts.inject(["bip39"]);

		await cli.withFlags({ bip39: bip39Flags }).execute(Command);

		assert.equal(require(`${process.env.CORE_PATH_CONFIG}/delegates.json`), { secrets: [bip39Flags] });
	});

	it("#BIP39Command - should configure from a prompt if it receives a valid bip39 and confirmation", async ({
		cli,
	}) => {
		prompts.inject(["bip39", bip39Prompt, true]);

		await cli.execute(Command);

		assert.equal(require(`${process.env.CORE_PATH_CONFIG}/delegates.json`), { secrets: [bip39Prompt] });
	});

	it("#BIP39Command - should fail to configure from a prompt if it receives a valid bip39 and but no confirmation", async ({
		cli,
	}) => {
		prompts.inject(["bip39"]);

		await cli.withFlags({ bip39 }).execute(Command);

		prompts.inject(["bip39", bip39Prompt, false]);

		await cli.execute(Command);

		assert.equal(require(`${process.env.CORE_PATH_CONFIG}/delegates.json`), { secrets: [bip39] });
	});

	it("#BIP39Command - should fail to configure from a prompt if it receives an invalid bip39", async ({ cli }) => {
		prompts.inject(["bip39"]);

		await cli.withFlags({ bip39 }).execute(Command);

		prompts.inject(["bip39", "random-string", true]);

		await assert.rejects(() => cli.execute(Command), "Failed to verify the given passphrase as BIP39 compliant.");

		assert.equal(require(`${process.env.CORE_PATH_CONFIG}/delegates.json`), { secrets: [bip39] });
	});

	it("BIP38Command - should configure from flags", async ({ cli }) => {
		prompts.inject(["bip38"]);

		await cli.withFlags({ bip39: bip39Flags, password }).execute(Command);

		assert.equal(require(`${process.env.CORE_PATH_CONFIG}/delegates.json`), {
			bip38: "6PYSTpJLxqjj8CFJSY5LSPVeyB52U9dqqZCL7DBJe7n5LUWZZfUJktGy31",
			secrets: [],
		});
	});

	it("BIP38Command - should configure from a prompt if it receives a valid bip39, password and confirmation", async ({
		cli,
	}) => {
		prompts.inject(["bip38", bip39Prompt, password, true]);

		await cli.execute(Command);

		assert.equal(require(`${process.env.CORE_PATH_CONFIG}/delegates.json`), {
			bip38: "6PYVDkKQRjbiWGHwwkXL4dpfCx2AuvCnjqyoMQs83NVNJ27MGUKqYMoMGG",
			secrets: [],
		});
	});

	it("BIP38Command - should fail to configure from a prompt if it receives an invalid bip39", async ({ cli }) => {
		prompts.inject(["bip38"]);

		await cli.withFlags({ bip39, password }).execute(Command);

		assert.equal(require(`${process.env.CORE_PATH_CONFIG}/delegates.json`), {
			bip38: "6PYTQC4c3Te5FCbnU5Z59uZCav121nypLmxanYn21ZoNTdc81eB9wTqeTe",
			secrets: [],
		});

		stub(cli.app.get(Container.Identifiers.Prompt), "render").returnValue({
			bip39: "random-string",
			confirm: true,
			method: "bip38",
			password,
		});

		await assert.rejects(() => cli.execute(Command), "Failed to verify the given passphrase as BIP39 compliant.");
	});

	it("BIP38Command - should fail to configure from a prompt if it doesn't receive a bip39", async ({ cli }) => {
		stub(cli.app.get(Container.Identifiers.Prompt), "render").returnValue({
			bip39: null,
			confirm: true,
			method: "bip38",
			password,
		});

		await assert.rejects(() => cli.execute(Command), "Failed to verify the given passphrase as BIP39 compliant.");
	});

	it("BIP38Command - should fail to configure from a prompt if it doesn't receive a password", async ({ cli }) => {
		stub(cli.app.get(Container.Identifiers.Prompt), "render").returnValue({
			bip39,
			confirm: true,
			method: "bip38",
			password: null,
		});

		await assert.rejects(() => cli.execute(Command), "The BIP38 password has to be a string.");
	});
});
