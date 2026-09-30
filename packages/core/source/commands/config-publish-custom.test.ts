import { existsSync, readFileSync, writeFileSync } from "fs";
import { ensureDirSync } from "fs-extra/esm";
import { join } from "path";
import { pathToFileURL } from "url";
import { dirSync, setGracefulCleanup } from "tmp";

import { Console } from "@mainsail/cli";
import { describe } from "@mainsail/test-runner";
import { Command } from "./config-publish-custom";

describe<{
	cli: Console;
	configDestination: string;
	appUrl: string;
	cryptoUrl: string;
}>("ConfigPublishCustomCommand", ({ beforeEach, afterAll, it, assert, nock }) => {
	// #getFile supports file:// URLs, so the fetched configs are plain temp files —
	// only the snapshot download goes over HTTP (mocked via nock).
	const makeSourceFile = (name: string, content: string): string => {
		const file = join(dirSync().name, name);
		writeFileSync(file, content);

		return pathToFileURL(file).toString();
	};

	beforeEach((context) => {
		process.env.MAINSAIL_PATH_CONFIG = dirSync().name;

		context.configDestination = join(process.env.MAINSAIL_PATH_CONFIG, "core");
		context.appUrl = makeSourceFile("app.json", '{"source":"app"}');
		context.cryptoUrl = makeSourceFile("crypto.json", '{"source":"crypto"}');

		context.cli = new Console();
	});

	afterAll(() => setGracefulCleanup());

	it("should require the app and crypto flags", async ({ cli }) => {
		await assert.rejects(
			() => cli.execute(Command),
			"You must provide the --app and --crypto flags to publish the configuration.",
		);
	});

	it("should publish the configuration from the given sources", async ({
		cli,
		configDestination,
		appUrl,
		cryptoUrl,
	}) => {
		await cli.withFlags({ app: appUrl, crypto: cryptoUrl }).execute(Command);

		assert.equal(readFileSync(join(configDestination, "app.json"), "utf8"), '{"source":"app"}');
		assert.equal(readFileSync(join(configDestination, "crypto.json"), "utf8"), '{"source":"crypto"}');
		// Defaults are written for the rest.
		assert.true(readFileSync(join(configDestination, ".env"), "utf8").includes("MAINSAIL_LOG_LEVEL=info"));
		assert.equal(JSON.parse(readFileSync(join(configDestination, "validators.json"), "utf8")), { secrets: [] });
		assert.equal(JSON.parse(readFileSync(join(configDestination, "peers.json"), "utf8")).list[0].ip, "127.0.0.1");
	});

	it("should publish a custom peers file", async ({ cli, configDestination, appUrl, cryptoUrl }) => {
		const peersUrl = makeSourceFile("peers.json", '{"list":[{"ip":"10.0.0.1","port":4000}]}');

		await cli.withFlags({ app: appUrl, crypto: cryptoUrl, peers: peersUrl }).execute(Command);

		assert.equal(JSON.parse(readFileSync(join(configDestination, "peers.json"), "utf8")).list[0].ip, "10.0.0.1");
	});

	it("should keep existing files unless overwrite is set", async ({ cli, configDestination, appUrl, cryptoUrl }) => {
		ensureDirSync(configDestination);
		writeFileSync(join(configDestination, ".env"), "SENTINEL=1");
		writeFileSync(join(configDestination, "app.json"), '{"source":"existing"}');

		await cli.withFlags({ app: appUrl, crypto: cryptoUrl }).execute(Command);

		assert.equal(readFileSync(join(configDestination, ".env"), "utf8"), "SENTINEL=1");
		assert.equal(readFileSync(join(configDestination, "app.json"), "utf8"), '{"source":"existing"}');

		await cli.withFlags({ app: appUrl, crypto: cryptoUrl, overwrite: true }).execute(Command);

		// app.json is re-fetched with --overwrite; the .env skip only checks for existence.
		assert.equal(readFileSync(join(configDestination, "app.json"), "utf8"), '{"source":"app"}');
		assert.equal(readFileSync(join(configDestination, ".env"), "utf8"), "SENTINEL=1");
	});

	it("should remove the existing configuration with the reset flag", async ({
		cli,
		configDestination,
		appUrl,
		cryptoUrl,
	}) => {
		ensureDirSync(configDestination);
		writeFileSync(join(configDestination, ".env"), "SENTINEL=1");

		await cli.withFlags({ app: appUrl, crypto: cryptoUrl, reset: true }).execute(Command);

		assert.true(readFileSync(join(configDestination, ".env"), "utf8").includes("MAINSAIL_LOG_LEVEL=info"));
	});

	it("should fail when a source file cannot be fetched", async ({ cli, cryptoUrl }) => {
		await assert.rejects(
			() => cli.withFlags({ app: "file:///definitely/not/there/app.json", crypto: cryptoUrl }).execute(Command),
			"Failed to fetch file from file:///definitely/not/there/app.json",
		);
	});

	it("should download the snapshot", async ({ cli, configDestination, appUrl, cryptoUrl }) => {
		nock.fake("http://snapshots.test").get("/abc123.compressed").reply(200, "snapshot-bytes");

		await cli
			.withFlags({
				app: appUrl,
				crypto: cryptoUrl,
				snapshot: "http://snapshots.test/abc123.compressed",
			})
			.execute(Command);

		assert.equal(readFileSync(join(configDestination, "snapshot", "abc123.compressed"), "utf8"), "snapshot-bytes");
	});

	it("should reject a snapshot with an invalid file name", async ({ cli, configDestination, appUrl, cryptoUrl }) => {
		await assert.rejects(
			() =>
				cli
					.withFlags({ app: appUrl, crypto: cryptoUrl, snapshot: "http://127.0.0.1:1/INVALID.zip" })
					.execute(Command),
			"Invalid file name: INVALID.zip. Expected format: <hash>.compressed.",
		);

		assert.false(existsSync(join(configDestination, "snapshot", "INVALID.zip")));
	});
});
