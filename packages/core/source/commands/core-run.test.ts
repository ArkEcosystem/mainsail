import { Keystore } from "@chainsafe/bls-keystore";
import { Console, Utils } from "@mainsail/cli";
import { describe } from "@mainsail/test-runner";
import { ensureDirSync, writeJSONSync } from "fs-extra/esm";
import prompts from "prompts";
import { dirSync, setGracefulCleanup } from "tmp";

import { Command } from "./core-run";

describe<{
	cli: Console;
}>("CoreRunCommand", ({ beforeEach, afterAll, it, stub, assert }) => {
	beforeEach((context) => {
		process.env.MAINSAIL_PATH_CONFIG = dirSync().name;

		ensureDirSync(`${process.env.MAINSAIL_PATH_CONFIG}/core`);

		context.cli = new Console();
	});

	afterAll(() => setGracefulCleanup());

	const validatorsPath = () => `${process.env.MAINSAIL_PATH_CONFIG}/core/validators.json`;

	// Encrypting a keystore is slow (scrypt); create it once and reuse across tests.
	let keystore: string | undefined;
	const createKeystore = async (): Promise<string> =>
		(keystore ??= (
			await Keystore.create(
				"password",
				Buffer.from("aa".repeat(32), "hex"),
				Buffer.from("bb".repeat(48), "hex"),
				"",
			)
		).stringify());

	// core:run never resolves by design (it keeps the process in the foreground), so the
	// execution promise is intentionally not awaited; tests instead await a promise resolved
	// from inside the buildApplication stub.
	const stubBuildApplication = () => {
		let captured: any;
		const called = new Promise<void>((resolve) => {
			stub(Utils.Builder, "buildApplication").callsFake(async (options: any) => {
				captured = options;
				resolve();
			});
		});

		return { called, options: () => captured };
	};

	it("should build the application with the core flags", async ({ cli }) => {
		const build = stubBuildApplication();

		cli.execute(Command);

		await build.called;

		const options = build.options();
		assert.equal(options.flags.name, "core");
		assert.equal(options.flags.env, "production");
		assert.false(options.flags.skipPrompts);
		assert.equal(options.plugins["@mainsail/p2p"], {
			disableDiscovery: false,
			ignoreMinimumNetworkReach: false,
			skipDiscovery: false,
		});
		// No validators.json in the config directory -> no validator plugin configuration.
		assert.undefined(options.plugins["@mainsail/validator"]);
	});

	it("should build the application with the [--env] and [--skipPrompts] flags", async ({ cli }) => {
		const build = stubBuildApplication();

		cli.withFlags({ env: "test", skipPrompts: true }).execute(Command);

		await build.called;

		assert.equal(build.options().flags.env, "test");
		assert.true(build.options().flags.skipPrompts);
	});

	it("should not configure the validator plugin when validators.json has no keystore", async ({ cli }) => {
		writeJSONSync(validatorsPath(), { secrets: ["bip39"] });
		const build = stubBuildApplication();

		cli.execute(Command);

		await build.called;

		assert.undefined(build.options().plugins["@mainsail/validator"]);
	});

	it("should configure the validator plugin when the [--password] flag matches the keystore", async ({ cli }) => {
		writeJSONSync(validatorsPath(), { keystore: await createKeystore(), secrets: [] });
		const build = stubBuildApplication();

		cli.withFlags({ password: "password" }).execute(Command);

		await build.called;

		assert.equal(build.options().plugins["@mainsail/validator"], { validatorKeystorePassword: "password" });
	});

	it("should throw when the [--password] flag does not match the keystore", async ({ cli }) => {
		writeJSONSync(validatorsPath(), { keystore: await createKeystore(), secrets: [] });
		const spyBuildApplication = stub(Utils.Builder, "buildApplication");

		await assert.rejects(() => cli.withFlags({ password: "wrong" }).execute(Command), "Invalid keystore password");

		spyBuildApplication.neverCalled();
	});

	it("should ask for the keystore password when the [--password] flag is absent", async ({ cli }) => {
		writeJSONSync(validatorsPath(), { keystore: await createKeystore(), secrets: [] });
		const build = stubBuildApplication();

		prompts.inject(["password", "password"]);

		cli.execute(Command);

		await build.called;

		assert.equal(build.options().plugins["@mainsail/validator"], { validatorKeystorePassword: "password" });
	});

	it("should throw when no password is provided at the prompt", async ({ cli }) => {
		writeJSONSync(validatorsPath(), { keystore: await createKeystore(), secrets: [] });
		const spyBuildApplication = stub(Utils.Builder, "buildApplication");

		prompts.inject([null, null]);

		await assert.rejects(() => cli.execute(Command), "The password has to be a string.");

		spyBuildApplication.neverCalled();
	});
});
