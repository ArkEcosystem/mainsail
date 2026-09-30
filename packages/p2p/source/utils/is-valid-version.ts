import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import semver from "semver";

// @TODO review the implementation
export const isValidVersion = (app: Contracts.Kernel.Application, version: string): boolean => {
	if (!version) {
		return false;
	}

	if (!semver.valid(version)) {
		return false;
	}

	const cryptoConfiguration: Contracts.Crypto.Configuration = app.get(Identifiers.Cryptography.Configuration);

	let minimumVersions: string[];
	const milestones = cryptoConfiguration.getMilestone();

	const { p2p } = milestones;

	if (p2p && Array.isArray(p2p.minimumVersions) && p2p.minimumVersions.length > 0) {
		minimumVersions = p2p.minimumVersions;
	} else {
		const configuration = app.getTagged<Contracts.Kernel.PluginConfiguration>(
			Identifiers.ServiceProvider.Configuration,
			"plugin",
			"p2p",
		);
		minimumVersions = configuration.getOptional<string[]>("minimumVersions", []);
	}

	const includePrerelease: boolean = cryptoConfiguration.getNetwork().name !== "mainnet";
	// TODO: semver is pinned to 7.8.0 (see scripts/deps/update.sh); since 7.8.3 "^0.0.x" no longer matches
	// prerelease builds under includePrerelease, which breaks the default minimumVersions.
	return minimumVersions.some((minimumVersion: string) =>
		semver.satisfies(version, minimumVersion, { includePrerelease }),
	);
};
