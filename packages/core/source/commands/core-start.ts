import { Commands, Contracts, Utils } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import Joi from "joi";
import { resolve } from "path";

@injectable()
export class Command extends Commands.Command {
	public signature = "core:start";

	public description = "Start the Core process.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string())
			.setFlag("network", "The name of the network.", Joi.string())
			.setFlag("env", "", Joi.string().default("production"))
			.setFlag("networkStart", "Indicate that this is the first start of seeds.", Joi.boolean())
			.setFlag("disableDiscovery", "Permanently disable all peer discovery.", Joi.boolean())
			.setFlag("skipDiscovery", "Skip the initial peer discovery.", Joi.boolean())
			.setFlag("ignoreMinimumNetworkReach", "Ignore the minimum network reach on start.", Joi.boolean())
			.setFlag("launchMode", "The mode the relay will be launched in (seed only at the moment).", Joi.string())
			.setFlag("bip39", "A validator plain text passphrase. Referred to as BIP39.", Joi.string())
			.setFlag("password", "A custom password that encrypts the BIP39. Referred to as BIP38.", Joi.string())
			.setFlag("daemon", "Start the Core process as a daemon.", Joi.boolean().default(true))
			.setFlag("skipPrompts", "Skip prompts.", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		const flags: Contracts.AnyObject = { ...this.getFlags() };

		this.actions.abortRunningProcess(`${flags.token}-forger`);
		this.actions.abortRunningProcess(`${flags.token}-relay`);

		await this.actions.daemonizeProcess(
			{
				args: `core:run ${Utils.Flags.castFlagsToString(flags, ["daemon"])}`,
				name: `${flags.token}-core`,
				script: resolve(__dirname, "../../bin/run"),
			},
			flags,
		);
	}
}
