import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
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
	const milestones: Record<string, any> = cryptoConfiguration.getMilestone();

	const { p2p } = milestones;

	if (p2p && Array.isArray(p2p.minimumVersions) && p2p.minimumVersions.length > 0) {
		minimumVersions = p2p.minimumVersions;
	} else {
		const configuration = app.getTagged<Providers.PluginConfiguration>(
			Identifiers.PluginConfiguration,
			"plugin",
			"p2p",
		);
		minimumVersions = configuration.getOptional<string[]>("minimumVersions", []);
	}

	const includePrerelease: boolean = cryptoConfiguration.get("network.name") !== "mainnet";
	return minimumVersions.some((minimumVersion: string) =>
		semver.satisfies(version, minimumVersion, { includePrerelease }),
	);
};
