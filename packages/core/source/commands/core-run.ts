import { Commands, Contracts, Utils } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import { Utils as AppUtils } from "@mainsail/kernel";
import { readJSONSync } from "fs-extra/esm";
import Joi from "joi";
import path from "path";
import { URL } from "url";

@injectable()
export class Command extends Commands.Command {
	public signature = "core:run";

	public description = "Run the Core process in foreground. Exiting the process will stop it from running.";

	public configure(): void {
		this.definition
			.setFlag("env", "", Joi.string().default("production"))
			.setFlag("disableDiscovery", "Permanently disable all peer discovery.", Joi.boolean())
			.setFlag("skipDiscovery", "Skip the initial peer discovery.", Joi.boolean())
			.setFlag("ignoreMinimumNetworkReach", "Ignore the minimum network reach on start.", Joi.boolean())
			.setFlag("launchMode", "The mode the relay will be launched in (seed only at the moment).", Joi.string())
			.setFlag("bip39", "A validator plain text passphrase. Referred to as BIP39.", Joi.string())
			.setFlag("password", "A custom password that encrypts the BIP39. Referred to as BIP38.", Joi.string())
			.setFlag("skipPrompts", "Skip prompts.", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		// eslint-disable-next-line unicorn/prefer-module
		const dirname = __dirname ?? new URL(".", import.meta.url).pathname;

		const { name } = readJSONSync(path.resolve(dirname, "../../package.json"));
		AppUtils.assert.defined<string>(name);

		const flags: Contracts.AnyObject = {
			...this.getFlags(),
			name: name.split("/")[1],
		};

		await Utils.Builder.buildApplication({
			flags,
			plugins: {
				"@mainsail/p2p": Utils.Builder.buildPeerFlags(flags),
			},
		});

		// Prevent resolving execute method
		return new Promise(() => {});
	}
}
