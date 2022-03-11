import { Container } from "@arkecosystem/core-cli";
import { Console, describe } from "@arkecosystem/core-test-framework";

import { Command } from "./update";

describe<{
	cli: Console;
}>("UpdateCommand", ({ beforeEach, it, assert, stub, spy }) => {
	const updater = {
		check: () => {},
		update: () => {},
	};

	const actionFactory = {
		restartRunningProcess: () => {},
		restartRunningProcessWithPrompt: () => {},
	};

	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Container.Identifiers.Updater).toConstantValue(updater);
		context.cli.app.rebind(Container.Identifiers.ActionFactory).toConstantValue(actionFactory);
	});

	it("should not update if check returns false", async ({ cli }) => {
		const spyCheck = stub(updater, "check").resolvedValue(false);
		const spyUpdate = stub(updater, "update");

		await assert.resolves(() => cli.execute(Command));

		spyCheck.calledOnce();
		spyUpdate.neverCalled();
	});

	it("should update with prompts", async ({ cli }) => {
		const spyCheck = stub(updater, "check").resolvedValue(true);
		const spyUpdate = stub(updater, "update");
		const spyRestar = stub(actionFactory, "restartRunningProcess");
		const spyRestartWithPrompt = stub(actionFactory, "restartRunningProcessWithPrompt");

		await assert.resolves(() => cli.execute(Command));

		spyCheck.calledOnce();
		spyUpdate.calledOnce();
		spyRestar.neverCalled();
		spyRestartWithPrompt.calledTimes(3);
	});

	it("should update without a prompt if the [--force] flag is present", async ({ cli }) => {
		const spyCheck = stub(updater, "check").resolvedValue(true);
		const spyUpdate = stub(updater, "update");
		const spyRestar = stub(actionFactory, "restartRunningProcess");
		const spyRestartWithPrompt = stub(actionFactory, "restartRunningProcessWithPrompt");

		await assert.resolves(() => cli.withFlags({ force: true, updateProcessManager: false }).execute(Command));

		spyCheck.calledOnce();
		spyUpdate.calledOnce();
		spyUpdate.calledWith(false, true);
		spyRestar.neverCalled();
		spyRestartWithPrompt.neverCalled();
	});

	it("should update and update process manager without a prompt if the [--force --updateProcessManager] flag is present", async ({
		cli,
	}) => {
		const spyCheck = stub(updater, "check").resolvedValue(true);
		const spyUpdate = stub(updater, "update");
		const spyRestar = stub(actionFactory, "restartRunningProcess");
		const spyRestartWithPrompt = stub(actionFactory, "restartRunningProcessWithPrompt");

		await assert.resolves(() => cli.withFlags({ force: true, updateProcessManager: true }).execute(Command));

		spyCheck.calledOnce();
		spyUpdate.calledOnce();
		spyUpdate.calledWith(true, true);
		spyRestar.neverCalled();
		spyRestartWithPrompt.neverCalled();
	});

	it("should update and restart without a prompt if the [--force --restart] flag is present", async ({ cli }) => {
		const spyCheck = stub(updater, "check").resolvedValue(true);
		const spyUpdate = stub(updater, "update");
		const spyRestar = stub(actionFactory, "restartRunningProcess");
		const spyRestartWithPrompt = stub(actionFactory, "restartRunningProcessWithPrompt");

		await assert.resolves(() => cli.withFlags({ force: true, restart: true }).execute(Command));

		spyCheck.calledOnce();
		spyUpdate.calledOnce();
		spyUpdate.calledWith(false, true);
		spyRestar.calledTimes(3);
		spyRestartWithPrompt.neverCalled();
	});

	it("should update and restart core without a prompt if the [--force --restartCore] flag is present", async ({
		cli,
	}) => {
		const spyCheck = stub(updater, "check").resolvedValue(true);
		const spyUpdate = stub(updater, "update");
		const spyRestar = stub(actionFactory, "restartRunningProcess");
		const spyRestartWithPrompt = stub(actionFactory, "restartRunningProcessWithPrompt");

		await assert.resolves(() => cli.withFlags({ force: true, restartCore: true }).execute(Command));

		spyCheck.calledOnce();
		spyUpdate.calledOnce();
		spyUpdate.calledWith(false, true);
		spyRestar.calledOnce();
		spyRestar.calledWith("ark-core");
		spyRestartWithPrompt.neverCalled();
	});

	it("should update and restart relay without a prompt if the [--force --restartRelay] flag is present", async ({
		cli,
	}) => {
		const spyCheck = stub(updater, "check").resolvedValue(true);
		const spyUpdate = stub(updater, "update");
		const spyRestar = stub(actionFactory, "restartRunningProcess");
		const spyRestartWithPrompt = stub(actionFactory, "restartRunningProcessWithPrompt");

		await assert.resolves(() => cli.withFlags({ force: true, restartRelay: true }).execute(Command));

		spyCheck.calledOnce();
		spyUpdate.calledOnce();
		spyUpdate.calledWith(false, true);
		spyRestar.calledOnce();
		spyRestar.calledWith("ark-relay");
		spyRestartWithPrompt.neverCalled();
	});

	it("should update and restart relay without a prompt if the [--force --restartRelay] flag is present", async ({
		cli,
	}) => {
		const spyCheck = stub(updater, "check").resolvedValue(true);
		const spyUpdate = stub(updater, "update");
		const spyRestar = stub(actionFactory, "restartRunningProcess");
		const spyRestartWithPrompt = stub(actionFactory, "restartRunningProcessWithPrompt");

		await assert.resolves(() => cli.withFlags({ force: true, restartRelay: true }).execute(Command));

		spyCheck.calledOnce();
		spyUpdate.calledOnce();
		spyUpdate.calledWith(false, true);
		spyRestar.calledOnce();
		spyRestar.calledWith("ark-relay");
		spyRestartWithPrompt.neverCalled();
	});

	it("should update and restart relay without a prompt if the [--force --restartForger] flag is present", async ({
		cli,
	}) => {
		const spyCheck = stub(updater, "check").resolvedValue(true);
		const spyUpdate = stub(updater, "update");
		const spyRestar = stub(actionFactory, "restartRunningProcess");
		const spyRestartWithPrompt = stub(actionFactory, "restartRunningProcessWithPrompt");

		await assert.resolves(() => cli.withFlags({ force: true, restartForger: true }).execute(Command));

		spyCheck.calledOnce();
		spyUpdate.calledOnce();
		spyUpdate.calledWith(false, true);
		spyRestar.calledOnce();
		spyRestar.calledWith("ark-forger");
		spyRestartWithPrompt.neverCalled();
	});
});
