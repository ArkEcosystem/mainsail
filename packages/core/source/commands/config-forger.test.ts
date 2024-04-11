import { ensureDirSync, readJSONSync, writeJSONSync } from "fs-extra/esm";
import prompts from "prompts";
import { dirSync, setGracefulCleanup } from "tmp";

import { Console, describe } from "../../../test-framework/source";
import { Command } from "./config-forger";

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

	it("should configure from flags (BIP39)", async ({ cli }) => {
		await cli.withFlags({ bip39: bip39Flags, method: "bip39" }).execute(Command);

		assert.equal(readJSONSync(`${process.env.CORE_PATH_CONFIG}/core/validators.json`), { secrets: [bip39Flags] });
	});

	it("should configure from flags (BIP38)", async ({ cli }) => {
		await cli.withFlags({ bip39: bip39Flags, method: "bip38", password: "password" }).execute(Command);

		assert.equal(readJSONSync(`${process.env.CORE_PATH_CONFIG}/core/validators.json`), { secrets: [] });
	});

	it("should prompt if method is missing", async ({ cli }) => {
		prompts.inject(["bip39"]);

		await cli.withFlags({ bip39: bip39Flags }).execute(Command);

		assert.equal(readJSONSync(`${process.env.CORE_PATH_CONFIG}/core/validators.json`), { secrets: [bip39Flags] });
	});
});
