import { Commands, Contracts, Utils } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import { Utils as AppUtils } from "@mainsail/kernel";
import Joi from "joi";
import { resolve } from "path";

@injectable()
export class Command extends Commands.Command {
	public signature = "core:run";

	public description = "Run the Core process in foreground. Exiting the process will stop it from running.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string().required())
			.setFlag("network", "The name of the network.", Joi.string().required())
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
		const { bin } = require(resolve(__dirname, "../../package.json"));
		AppUtils.assert.defined<Record<string, string>>(bin);

		const flags: Contracts.AnyObject = {
			...this.getFlags(),
			name: Object.keys(bin)[0],
		};

		await Utils.Builder.buildApplication({
			flags,
			plugins: {
				"@mainsail/p2p": Utils.Builder.buildPeerFlags(flags),
			},
		});

		// Prevent resolving execute method
		return new Promise(() => { });
	}
}
