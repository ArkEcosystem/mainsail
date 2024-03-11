import { Console, describe } from "@mainsail/test-framework";
import { ensureDirSync, writeJSONSync } from "fs-extra/esm";
import prompts from "prompts";
import { dirSync, setGracefulCleanup } from "tmp";

import { Command } from "./config-forger-bip38";
import { Command as BIP39Command } from "./config-forger-bip39";

describe<{
	cli: Console;
}>("ConfigForgerBIP38Command", ({ beforeEach, afterAll, it, assert }) => {
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
		await cli.withFlags({ bip39: bip39Flags, password: "password" }).execute(Command);

		assert.equal(require(`${process.env.CORE_PATH_CONFIG}/core/validators.json`), { secrets: [] });
	});

	it("should configure from a prompt if it receives a valid bip39 and confirmation", async ({ cli }) => {
		prompts.inject([bip39Prompt, "password", "password"]);

		await cli.execute(Command);

		assert.equal(require(`${process.env.CORE_PATH_CONFIG}/core/validators.json`), { secrets: [] });
	});

	it("should fail to configure from a prompt if it receives an invalid bip39", async ({ cli }) => {
		await cli.withFlags({ bip39 }).execute(BIP39Command);

		prompts.inject(["random-string", "password", "password"]);

		await assert.rejects(() => cli.execute(Command), "Failed to verify the given passphrase as BIP39 compliant.");

		assert.equal(require(`${process.env.CORE_PATH_CONFIG}/core/validators.json`), { secrets: [bip39] });
	});

	it("should configure from a prompt if it receives an invalid bip39 and skipValidation flag is set", async ({
		cli,
	}) => {
		await cli.withFlags({ bip39 }).execute(BIP39Command);

		prompts.inject(["random-string", "password", "password"]);

		await cli.withFlags({ skipValidation: true }).execute(Command);

		assert.equal(require(`${process.env.CORE_PATH_CONFIG}/core/validators.json`), {
			secrets: [],
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
