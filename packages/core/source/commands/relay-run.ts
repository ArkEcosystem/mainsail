import { Commands, Container, Utils } from "@arkecosystem/core-cli";
import Joi from "joi";

@Container.injectable()
export class Command extends Commands.Command {
	public signature = "relay:run";

	public description = "Run the Relay process in foreground. Exiting the process will stop it from running.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string())
			.setFlag("network", "The name of the network.", Joi.string())
			.setFlag("env", "", Joi.string().default("production"))
			.setFlag("networkStart", "Indicate that this is the first start of seeds.", Joi.boolean())
			.setFlag("disableDiscovery", "Permanently disable all peer discovery.", Joi.boolean())
			.setFlag("skipDiscovery", "Skip the initial peer discovery.", Joi.boolean())
			.setFlag("ignoreMinimumNetworkReach", "Ignore the minimum network reach on start.", Joi.boolean())
			.setFlag("launchMode", "The mode the relay will be launched in (seed only at the moment).", Joi.string());
	}

	public async execute(): Promise<void> {
		const flags = { ...this.getFlags() };
		flags.processType = "relay";

		await Utils.buildApplication({
			flags,
			plugins: {
				"@arkecosystem/core-blockchain": {
					networkStart: flags.networkStart,
				},
				"@arkecosystem/core-p2p": Utils.buildPeerFlags(flags),
			},
		});

		// Prevent resolving execute method
		return new Promise(() => {});
	}
}
