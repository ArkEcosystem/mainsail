import { rcompare, satisfies } from "semver";

import { execa } from "../execa";
import { injectable } from "../ioc";

@injectable()
export class Installer {
	public install(package_: string, tag = "latest"): void {
		this.installPeerDependencies(package_, tag);

		const { stdout, stderr, exitCode } = execa.sync(`yarn global add ${package_}@${tag} --force`, { shell: true });

		if (exitCode !== 0) {
			throw new Error(`"yarn global add ${package_}@${tag} --force" exited with code ${exitCode}\n${stderr}`);
		}

		console.log(stdout);
	}

	public installPeerDependencies(package_: string, tag = "latest"): void {
		const { stdout, stderr, exitCode } = execa.sync(`yarn info ${package_}@${tag} peerDependencies --json`, {
			shell: true,
		});

		if (exitCode !== 0) {
			throw new Error(
				`"yarn info ${package_}@${tag} peerDependencies --json" exited with code ${exitCode}\n${stderr}`,
			);
		}

		for (const [peerPackage, peerPackageSemver] of Object.entries(JSON.parse(stdout).data ?? {})) {
			this.installRangeLatest(peerPackage, peerPackageSemver as string);
		}
	}

	public installRangeLatest(package_: string, range: string): void {
		const { stdout, stderr, exitCode } = execa.sync(`yarn info ${package_} versions --json`, { shell: true });

		if (exitCode !== 0) {
			throw new Error(`"yarn info ${package_} versions --json" exited with code ${exitCode}\n${stderr}`);
		}

		const versions = (JSON.parse(stdout).data as string[])
			.filter((v) => satisfies(v, range))
			.sort((a, b) => rcompare(a, b));

		if (versions.length === 0) {
			throw new Error(`No ${package_} version to satisfy ${range}`);
		}

		this.install(package_, versions[0]);
	}
}
