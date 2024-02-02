import { injectable } from "@mainsail/container";
import { rcompare, satisfies } from "semver";

import { execa } from "../execa";

type Package = {
	pkg: string;
	version: string;
};

/**
 * @export
 * @class Installer
 */
@injectable()
export class Installer {
	/**
	 * @param {string} pkg
	 * @memberof Installer
	 */
	public install(package_: string, tag: string = "latest"): void {
		this.installPeerDependencies(package_, tag);

		const { stdout, stderr, exitCode } = execa.sync(`pnpm install -g ${package_}@${tag}`, { shell: true });

		if (exitCode !== 0) {
			throw new Error(`"pnpm install -g ${package_}@${tag}" exited with code ${exitCode}\n${stderr}`);
		}

		console.log(stdout);
	}

	public installPeerDependencies(package_: string, tag: string = "latest"): void {
		const { stdout, stderr, exitCode } = execa.sync(`pnpm info ${package_}@${tag} peerDependencies --json`, {
			shell: true,
		});

		if (exitCode !== 0) {
			throw new Error(
				`"pnpm info ${package_}@${tag} peerDependencies --json" exited with code ${exitCode}\n${stderr}`,
			);
		}

		const installedPackages = this.getInstalled();

		for (const [peerPackage, peerPackageSemver] of Object.entries(stdout !== "" ? JSON.parse(stdout) : {})) {
			const installedPackage = installedPackages.find((installed) => installed.pkg === peerPackage);
			if (!installedPackage || !satisfies(installedPackage.version, peerPackageSemver as string)) {
				this.installRangeLatest(peerPackage, peerPackageSemver as string);
			}
		}
	}

	public installRangeLatest(package_: string, range: string): void {
		const { stdout, stderr, exitCode } = execa.sync(`pnpm info ${package_} versions --json`, { shell: true });

		if (exitCode !== 0) {
			throw new Error(`"pnpm info ${package_} versions --json" exited with code ${exitCode}\n${stderr}`);
		}

		const versions = (stdout !== "" ? (JSON.parse(stdout) as string[]) : [])
			.filter((v) => satisfies(v, range))
			.sort((a, b) => rcompare(a, b));

		if (versions.length === 0) {
			throw new Error(`No ${package_} version to satisfy ${range}`);
		}

		this.install(package_, versions[0]);
	}

	private getInstalled(): Package[] {
		const { stdout, stderr, exitCode } = execa.sync(`pnpm list -g --json`, { shell: true });

		if (exitCode !== 0) {
			throw new Error(`"pnpm list -g --json" exited with code ${exitCode}\n${stderr}`);
		}

		if (stdout === "") {
			return [];
		}

		return Object.entries<{ version: string }>(JSON.parse(stdout)[0].dependencies).map(([package_, meta]) => ({
			pkg: package_,
			version: meta.version,
		}));
	}
}
