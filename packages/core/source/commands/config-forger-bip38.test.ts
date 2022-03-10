import { Container } from "@arkecosystem/core-cli";
import { Console, describe } from "@arkecosystem/core-test-framework";
import { writeJSONSync } from "fs-extra";
import prompts from "prompts";
import { dirSync, setGracefulCleanup } from "tmp";

import { Command } from "./config-forger-bip38";

describe<{
	cli: Console;
}>("ConfigForgerBIP38Commnad", ({ beforeEach, afterAll, it, assert, stub }) => {
	const bip39 = "clay harbor enemy utility margin pretty hub comic piece aerobic umbrella acquire";
	const bip39Flags = "venue below waste gather spin cruise title still boost mother flash tuna";
	const bip39Prompt = "craft imitate step mixture patch forest volcano business charge around girl confirm";
	const password = "password";

	beforeEach((context) => {
		process.env.CORE_PATH_CONFIG = dirSync().name;

		writeJSONSync(`${process.env.CORE_PATH_CONFIG}/delegates.json`, {});

		context.cli = new Console();
	});

	afterAll(() => setGracefulCleanup());

	it("should configure from flags", async ({ cli }) => {
		await cli.withFlags({ bip39: bip39Flags, password }).execute(Command);

		assert.equal(require(`${process.env.CORE_PATH_CONFIG}/delegates.json`), {
			bip38: "6PYSTpJLxqjj8CFJSY5LSPVeyB52U9dqqZCL7DBJe7n5LUWZZfUJktGy31",
			secrets: [],
		});
	});

	it("should configure from a prompt if it receives a valid bip39, password and confirmation", async ({ cli }) => {
		prompts.inject([bip39Prompt, password, true]);

		await cli.execute(Command);

		assert.equal(require(`${process.env.CORE_PATH_CONFIG}/delegates.json`), {
			bip38: "6PYVDkKQRjbiWGHwwkXL4dpfCx2AuvCnjqyoMQs83NVNJ27MGUKqYMoMGG",
			secrets: [],
		});
	});

	it("should fail to configure from a prompt if it receives an invalid bip39", async ({ cli }) => {
		await cli.withFlags({ bip39, password }).execute(Command);

		assert.equal(require(`${process.env.CORE_PATH_CONFIG}/delegates.json`), {
			bip38: "6PYTQC4c3Te5FCbnU5Z59uZCav121nypLmxanYn21ZoNTdc81eB9wTqeTe",
			secrets: [],
		});

		stub(cli.app.get(Container.Identifiers.Prompt), "render").returnValue({
			bip39: "random-string",
			password,
			passwordConfirmation: password,
		});

		await assert.rejects(() => cli.execute(Command), "Failed to verify the given passphrase as BIP39 compliant.");
	});

	it("should configure from a prompt if it receives an invalid bip39 amd skipValidation flag is set", async ({
		cli,
	}) => {
		await cli.withFlags({ bip39, password, skipValidation: true }).execute(Command);

		assert.equal(require(`${process.env.CORE_PATH_CONFIG}/delegates.json`), {
			bip38: "6PYTQC4c3Te5FCbnU5Z59uZCav121nypLmxanYn21ZoNTdc81eB9wTqeTe",
			secrets: [],
		});

		stub(cli.app.get(Container.Identifiers.Prompt), "render").returnValue({
			bip39: "random-string",
			password,
			passwordConfirmation: password,
		});

		await assert.rejects(() => cli.execute(Command), "Failed to verify the given passphrase as BIP39 compliant.");
	});

	it("should fail to configure from a prompt if it doesn't receive a bip39", async ({ cli }) => {
		stub(cli.app.get(Container.Identifiers.Prompt), "render").returnValue({
			bip39: null,
			password,
			passwordConfirmation: password,
		});

		await assert.rejects(() => cli.execute(Command), "Failed to verify the given passphrase as BIP39 compliant.");
	});

	it("should fail to configure from a prompt if it doesn't receive a password", async ({ cli }) => {
		stub(cli.app.get(Container.Identifiers.Prompt), "render").returnValue({
			bip39,
			confirm: true,
			password: null,
		});

		await assert.rejects(() => cli.execute(Command), "The BIP38 password has to be a string.");
	});

	it("should fail to configure from a prompt if it doesn't receive a valid bip39", async ({ cli }) => {
		await assert.rejects(
			() => cli.withFlags({ bip39: "random-string", password: "test" }).execute(Command),
			"Failed to verify the given passphrase as BIP39 compliant.",
		);
	});
});
