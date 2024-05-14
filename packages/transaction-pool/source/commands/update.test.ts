import { Identifiers } from "@mainsail/cli";
import { Console, describe } from "../../../test-framework/source";

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
		context.cli.app.rebind(Identifiers.Updater).toConstantValue(updater);
		context.cli.app.rebind(Identifiers.ActionFactory).toConstantValue(actionFactory);
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
		spyRestartWithPrompt.calledTimes(1);
	});

	it("should update without a prompt if the [--force] flag is present", async ({ cli }) => {
		const spyCheck = stub(updater, "check").resolvedValue(true);
		const spyUpdate = stub(updater, "update");
		const spyRestart = stub(actionFactory, "restartRunningProcess");
		const spyRestartWithPrompt = stub(actionFactory, "restartRunningProcessWithPrompt");

		await assert.resolves(() => cli.withFlags({ force: true, updateProcessManager: false }).execute(Command));

		spyCheck.calledOnce();
		spyUpdate.calledOnce();
		spyUpdate.calledWith(false, true);
		spyRestart.neverCalled();
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
		spyRestar.calledTimes(1);
		spyRestartWithPrompt.neverCalled();
	});
});
