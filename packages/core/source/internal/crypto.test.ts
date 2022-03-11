import { describe } from "@arkecosystem/core-test-framework";
import { writeJSONSync } from "fs-extra";
import prompts from "prompts";
import { dirSync, setGracefulCleanup } from "tmp";

import { Crypto } from "../exceptions";
import { buildBIP38 } from "./crypto";

describe("buildBIP38", ({ beforeEach, afterAll, it, assert }) => {
	beforeEach(() => {
		process.env.CORE_PATH_CONFIG = dirSync().name;
	});

	afterAll(() => setGracefulCleanup());

	it("should immediately return if a BIP39 passphrase is present", async () => {
		const { bip38, password } = await buildBIP38({ bip39: "bip39" });

		assert.undefined(bip38);
		assert.undefined(password);
	});

	it("should immediately return if a BIP38 and password are present as flags", async () => {
		const { bip38, password } = await buildBIP38({ bip38: "bip38", password: "password" });

		assert.equal(bip38, "bip38");
		assert.equal(password, "password");
	});

	it("should immediately return if a BIP38 and password are present as environmeng variable", async () => {
		process.env.CORE_FORGER_BIP38 = "bip38";
		process.env.CORE_FORGER_PASSWORD = "password";

		const { bip38, password } = await buildBIP38({});

		assert.equal(bip38, "bip38");
		assert.equal(password, "password");

		delete process.env.CORE_FORGER_BIP38;
		delete process.env.CORE_FORGER_PASSWORD;
	});

	it("should throw if the delegate configuration does not exist", async () => {
		await assert.rejects(
			() => buildBIP38({ network: "mainnet", token: "ark" }),
			new Crypto.MissingConfigFile(process.env.CORE_PATH_CONFIG + "/delegates.json").message,
		);
	});

	it("should use the bip38 from the delegate configuration", async () => {
		writeJSONSync(`${process.env.CORE_PATH_CONFIG}/delegates.json`, { bip38: "bip38" });

		prompts.inject(["password", true]);

		const { bip38, password } = await buildBIP38({ network: "mainnet", token: "ark" });

		assert.equal(bip38, "bip38");
		assert.equal(password, "password");
	});

	it("should throw if no bip38 or bip39 is present", async () => {
		writeJSONSync(`${process.env.CORE_PATH_CONFIG}/delegates.json`, { secrets: [] });

		await assert.rejects(() => buildBIP38({ network: "mainnet", token: "ark" }), Crypto.PassphraseNotDetected);
	});

	it("should throw if no secrets are present", async () => {
		writeJSONSync(`${process.env.CORE_PATH_CONFIG}/delegates.json`, {});

		await assert.rejects(() => buildBIP38({ network: "mainnet", token: "ark" }), Crypto.PassphraseNotDetected);
	});

	it("should throw if no bip38 password is provided and skipPrompts is true", async () => {
		writeJSONSync(`${process.env.CORE_PATH_CONFIG}/delegates.json`, { bip38: "bip38" });

		await assert.rejects(
			() => buildBIP38({ network: "mainnet", skipPrompts: true, token: "ark" }),
			Crypto.InvalidPassword,
		);
	});

	it("should throw if no bip38 password is provided", async () => {
		writeJSONSync(`${process.env.CORE_PATH_CONFIG}/delegates.json`, { bip38: "bip38" });

		prompts.inject([null, true]);

		await assert.rejects(() => buildBIP38({ network: "mainnet", token: "ark" }), Crypto.InvalidPassword);
	});

	it("should throw if no confirmation is provided", async () => {
		writeJSONSync(`${process.env.CORE_PATH_CONFIG}/delegates.json`, { bip38: "bip38" });

		prompts.inject(["password", false]);

		await assert.rejects(
			() => buildBIP38({ network: "mainnet", token: "ark" }),
			"You'll need to confirm the password to continue.",
		);
	});
});
