import { ensureDirSync, writeJSONSync, readJSONSync } from "fs-extra/esm";
import prompts from "prompts";
import { dirSync, setGracefulCleanup } from "tmp";

import { Console, describe } from "../../../test-framework/source";
import { Command } from "./config-forger-bip39";

describe<{
	cli: Console;
}>("ConfigForgerBIP39Command", ({ beforeEach, afterAll, it, assert }) => {
	const bip39 = "clay harbor enemy utility margin pretty hub comic piece aerobic umbrella acquire";
	const bip39Flags = "venue below waste gather spin cruise title still boost mother flash tuna";
	const bip39Prompt = "craft imitate step mixture patch forest volcano business charge around girl confirm";

	beforeEach((context) => {
		process.env.CORE_PATH_CONFIG = dirSync().name;

		ensureDirSync(`${process.env.CORE_PATH_CONFIG}/core/`);
		writeJSONSync(`${process.env.CORE_PATH_CONFIG}/core/validators.json`, {});

		context.cli = new Console();
	});

	afterAll(() => setGracefulCleanup());

	it("should configure from flags", async ({ cli }) => {
		await cli.withFlags({ bip39: bip39Flags }).execute(Command);

		assert.equal(readJSONSync(`${process.env.CORE_PATH_CONFIG}/core/validators.json`), { secrets: [bip39Flags] });
	});

	it("should configure from a prompt if it receives a valid bip39 and confirmation", async ({ cli }) => {
		prompts.inject([bip39Prompt, true]);

		await cli.execute(Command);

		assert.equal(readJSONSync(`${process.env.CORE_PATH_CONFIG}/core/validators.json`), { secrets: [bip39Prompt] });
	});

	it("should fail to configure from a prompt if it receives a valid bip39 and but no confirmation", async ({
		cli,
	}) => {
		await cli.withFlags({ bip39 }).execute(Command);

		prompts.inject([bip39Prompt, false]);

		await cli.execute(Command);

		assert.equal(readJSONSync(`${process.env.CORE_PATH_CONFIG}/core/validators.json`), { secrets: [bip39] });
	});

	it("should fail to configure from a prompt if it receives an invalid bip39", async ({ cli }) => {
		await cli.withFlags({ bip39 }).execute(Command);

		prompts.inject(["random-string", true]);

		await assert.rejects(() => cli.execute(Command), "Failed to verify the given passphrase as BIP39 compliant.");

		assert.equal(readJSONSync(`${process.env.CORE_PATH_CONFIG}/core/validators.json`), { secrets: [bip39] });
	});

	it("should configure from a prompt if it receives an invalid bip39 and skipValidation flag is set", async ({
		cli,
	}) => {
		await cli.withFlags({ bip39 }).execute(Command);

		prompts.inject(["random-string", true]);

		await cli.withFlags({ skipValidation: true }).execute(Command);

		assert.equal(readJSONSync(`${process.env.CORE_PATH_CONFIG}/core/validators.json`), {
			secrets: ["random-string"],
		});
	});

	it("should fail to configure from a prompt if it doesn't receive a bip39", async ({ cli }) => {
		prompts.inject([null, true]);

		await assert.rejects(() => cli.execute(Command), "Failed to verify the given passphrase as BIP39 compliant.");
	});

	it("should fail to configure from a prompt if it doesn't receive a valid bip39", async ({ cli }) => {
		await assert.rejects(
			() => cli.withFlags({ bip39: "random-string" }).execute(Command),
			"Failed to verify the given passphrase as BIP39 compliant.",
		);
	});
});
