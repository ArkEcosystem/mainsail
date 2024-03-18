import { setGracefulCleanup } from "tmp";

import { Console, describe } from "../../../test-framework/source";
import { execa } from "../execa";
import { Installer } from "./installer";

describe<{
	installer: Installer;
}>("Installer", ({ beforeEach, afterAll, it, spy, stub, assert }) => {
	beforeEach((context) => {
		const cli = new Console();

		context.installer = cli.app.resolve(Installer);
	});

	afterAll(() => setGracefulCleanup());

	it("#install - should install latest package when tag isn't provided", ({ installer }) => {
		stub(installer, "installPeerDependencies");

		const spySync = stub(execa, "sync").returnValue({
			exitCode: 0,
			stdout: "stdout",
		});

		installer.install("@mainsail/core");

		spySync.calledWith("pnpm install -g @mainsail/core@latest", { shell: true });
	});

	it("#install - should install specific package when tag is provided", ({ installer }) => {
		stub(installer, "installPeerDependencies");

		const spySync = stub(execa, "sync").returnValue({
			exitCode: 0,
			stdout: "stdout",
		});

		installer.install("@mainsail/core", "3.0.0");

		spySync.calledWith("pnpm install -g @mainsail/core@3.0.0", { shell: true });
	});

	it("#install - should throw when exit code isn't 0", ({ installer }) => {
		stub(installer, "installPeerDependencies");

		const spySync = stub(execa, "sync").returnValue({
			exitCode: 1,
			stderr: "stderr",
		});

		assert.throws(() => installer.install("@mainsail/core"), "stderr");

		spySync.calledWith("pnpm install -g @mainsail/core@latest", { shell: true });
	});

	it("#installPeerDependencies - should install each peer dependency", ({ installer }) => {
		const spyInstallRangeLatest = stub(installer, "installRangeLatest");

		const spySync = stub(execa, "sync")
			.returnValueOnce({
				exitCode: 0,
				stdout: JSON.stringify({ pm2: "4.5.0", somepkg: "^1.0.0" }),
			})
			.returnValue({
				exitCode: 0,
				stdout: "",
			});

		installer.installPeerDependencies("@mainsail/core", "3.0.0");

		spySync.calledWith("pnpm info @mainsail/core@3.0.0 peerDependencies --json", {
			shell: true,
		});

		spyInstallRangeLatest.calledWith("pm2", "4.5.0");
		spyInstallRangeLatest.calledWith("somepkg", "^1.0.0");
	});

	it("#installPeerDependencies - should not install peer dependencies when there aren't any", ({ installer }) => {
		const spyInstallRangeLatest = stub(installer, "installRangeLatest");

		const spySync = stub(execa, "sync").returnValue({
			exitCode: 0,
			stdout: "",
		});

		installer.installPeerDependencies("@mainsail/core", "3.0.0");

		spySync.calledWith("pnpm info @mainsail/core@3.0.0 peerDependencies --json", {
			shell: true,
		});

		spyInstallRangeLatest.neverCalled();
	});

	it("#installPeerDependencies - should throw error when yarn command fails", ({ installer }) => {
		const spySync = stub(execa, "sync").returnValue({
			exitCode: 1,
			stderr: "stderr",
		});

		assert.throws(() => installer.installPeerDependencies("@mainsail/core"), "stderr");

		spySync.calledWith("pnpm info @mainsail/core@latest peerDependencies --json", {
			shell: true,
		});
	});

	it("#installRangeLatest - should install highest matching version", ({ installer }) => {
		const spyInstall = stub(installer, "install");

		const spySync = stub(execa, "sync").returnValue({
			exitCode: 0,
			stdout: JSON.stringify(["3.0.0", "3.1.0", "3.0.0-next.9"]),
		});

		installer.installRangeLatest("@mainsail/core", "^3.0.0 <3.4.0");

		spySync.calledWith("pnpm info @mainsail/core versions --json", {
			shell: true,
		});

		spyInstall.calledWith("@mainsail/core", "3.1.0");
	});

	it("#installRangeLatest - should throw error when command fails", ({ installer }) => {
		const spySync = stub(execa, "sync").returnValue({
			exitCode: 1,
			stderr: "stderr",
		});

		assert.throws(() => installer.installRangeLatest("@mainsail/core", "^3.0.0 <3.4.0"), "stderr");

		spySync.calledWith("pnpm info @mainsail/core versions --json", {
			shell: true,
		});
	});

	it("#installRangeLatest - should throw error when there is no version matching requested range", ({
		installer,
	}) => {
		const spySync = stub(execa, "sync").returnValue({
			exitCode: 0,
			stdout: JSON.stringify(["3.0.0", "3.0.0-next.9"]),
		});

		assert.throws(
			() => installer.installRangeLatest("@mainsail/core", "^4.0.0 <4.4.0"),
			"No @mainsail/core version to satisfy ^4.0.0 <4.4.0".replace(/[\s#$()*+,.?[\\\]^{|}-]/g, "\\$&"),
		);

		spySync.calledWith("pnpm info @mainsail/core versions --json", {
			shell: true,
		});
	});
});
