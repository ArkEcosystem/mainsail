import { Container } from "@arkecosystem/core-cli";
import { Console, describe } from "@arkecosystem/core-test-framework";
import prompts from "prompts";
import { dirSync, setGracefulCleanup } from "tmp";

import { Command } from "./config-database";

describe<{
	cli: Console;
	envFile: string;
}>("ConfigDatabaseCommand", ({ beforeEach, afterAll, it, stub, assert }) => {
	beforeEach((context) => {
		process.env.CORE_PATH_CONFIG = dirSync().name;

		context.envFile = `${process.env.CORE_PATH_CONFIG}/.env`;

		context.cli = new Console();
	});

	afterAll(() => setGracefulCleanup());

	it("#Flags - should set the database host", async ({ cli, envFile }) => {
		const spyOnUpdateVariables = stub(cli.app.get(Container.Identifiers.Environment), "updateVariables");

		await cli.withFlags({ host: "localhost" }).execute(Command);

		spyOnUpdateVariables.calledOnce();
		spyOnUpdateVariables.calledWith(envFile, { CORE_DB_HOST: "localhost" });
	});

	it("#Flags - should set the database port", async ({ cli, envFile }) => {
		const spyOnUpdateVariables = stub(cli.app.get(Container.Identifiers.Environment), "updateVariables");

		await cli.withFlags({ port: "5432" }).execute(Command);

		spyOnUpdateVariables.calledOnce();
		spyOnUpdateVariables.calledWith(envFile, { CORE_DB_PORT: 5432 });
	});

	it("#Flags - should set the database name", async ({ cli, envFile }) => {
		const spyOnUpdateVariables = stub(cli.app.get(Container.Identifiers.Environment), "updateVariables");

		await cli.withFlags({ database: "ark_mainnet" }).execute(Command);

		spyOnUpdateVariables.calledOnce();
		spyOnUpdateVariables.calledWith(envFile, { CORE_DB_DATABASE: "ark_mainnet" });
	});

	it("#Flags - should set the database user", async ({ cli, envFile }) => {
		const spyOnUpdateVariables = stub(cli.app.get(Container.Identifiers.Environment), "updateVariables");

		await cli.withFlags({ username: "ark" }).execute(Command);

		spyOnUpdateVariables.calledOnce();
		spyOnUpdateVariables.calledWith(envFile, { CORE_DB_USERNAME: "ark" });
	});

	it("#Flags - should set the database password", async ({ cli, envFile }) => {
		const spyOnUpdateVariables = stub(cli.app.get(Container.Identifiers.Environment), "updateVariables");

		await cli.withFlags({ password: "password" }).execute(Command);

		spyOnUpdateVariables.calledOnce();
		spyOnUpdateVariables.calledWith(envFile, { CORE_DB_PASSWORD: "password" });
	});

	it("#Prompts - should set the database host", async ({ cli, envFile }) => {
		const spyOnUpdateVariables = stub(cli.app.get(Container.Identifiers.Environment), "updateVariables");

		prompts.inject(["dummy", undefined, undefined, undefined, undefined, true]);
		await cli.execute(Command);

		spyOnUpdateVariables.calledOnce();
		spyOnUpdateVariables.calledWith(envFile, {
			CORE_DB_DATABASE: "ark_testnet",
			CORE_DB_HOST: "dummy",
			CORE_DB_PASSWORD: "password",
			CORE_DB_PORT: 5432,
			CORE_DB_USERNAME: "ark",
		});
	});

	it("#Prompts - should set the database port", async ({ cli, envFile }) => {
		const spyOnUpdateVariables = stub(cli.app.get(Container.Identifiers.Environment), "updateVariables");

		prompts.inject([undefined, 5000, undefined, undefined, undefined, true]);
		await cli.execute(Command);

		spyOnUpdateVariables.calledOnce();
		spyOnUpdateVariables.calledWith(envFile, {
			CORE_DB_DATABASE: "ark_testnet",
			CORE_DB_HOST: "localhost",
			CORE_DB_PASSWORD: "password",
			CORE_DB_PORT: 5000,
			CORE_DB_USERNAME: "ark",
		});
	});

	it("#Prompts - should set the database name", async ({ cli, envFile }) => {
		const spyOnUpdateVariables = stub(cli.app.get(Container.Identifiers.Environment), "updateVariables");

		prompts.inject([undefined, undefined, "dummy", undefined, undefined, true]);
		await cli.execute(Command);

		spyOnUpdateVariables.calledOnce();
		spyOnUpdateVariables.calledWith(envFile, {
			CORE_DB_DATABASE: "dummy",
			CORE_DB_HOST: "localhost",
			CORE_DB_PASSWORD: "password",
			CORE_DB_PORT: 5432,
			CORE_DB_USERNAME: "ark",
		});
	});

	it("#Prompts - should set the database user", async ({ cli, envFile }) => {
		const spyOnUpdateVariables = stub(cli.app.get(Container.Identifiers.Environment), "updateVariables");

		prompts.inject([undefined, undefined, undefined, "dummy", undefined, true]);
		await cli.execute(Command);

		spyOnUpdateVariables.calledOnce();
		spyOnUpdateVariables.calledWith(envFile, {
			CORE_DB_DATABASE: "ark_testnet",
			CORE_DB_HOST: "localhost",
			CORE_DB_PASSWORD: "password",
			CORE_DB_PORT: 5432,
			CORE_DB_USERNAME: "dummy",
		});
	});

	it("#Prompts - should set the database password", async ({ cli, envFile }) => {
		const spyOnUpdateVariables = stub(cli.app.get(Container.Identifiers.Environment), "updateVariables");

		prompts.inject([undefined, undefined, undefined, undefined, "dummy", true]);
		await cli.execute(Command);

		spyOnUpdateVariables.calledOnce();
		spyOnUpdateVariables.calledWith(envFile, {
			CORE_DB_DATABASE: "ark_testnet",
			CORE_DB_HOST: "localhost",
			CORE_DB_PASSWORD: "dummy",
			CORE_DB_PORT: 5432,
			CORE_DB_USERNAME: "ark",
		});
	});

	it("#Prompts - should not update without a confirmation", async ({ cli, envFile }) => {
		const spyOnUpdateVariables = stub(cli.app.get(Container.Identifiers.Environment), "updateVariables");

		prompts.inject([undefined, undefined, undefined, undefined, "dummy", false]);
		await assert.rejects(() => cli.execute(Command), "You'll need to confirm the input to continue.");

		spyOnUpdateVariables.neverCalled();
	});
});
