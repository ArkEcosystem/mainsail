import { Commands, Container, Contracts, Utils } from "@arkecosystem/core-cli";
import Joi from "joi";

import { buildBIP38 } from "../internal/crypto";

@Container.injectable()
export class Command extends Commands.Command {
	public signature = "forger:run";

	public description = "Run the Forger process in foreground. Exiting the process will stop it from running.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string())
			.setFlag("network", "The name of the network.", Joi.string())
			.setFlag("env", "", Joi.string().default("production"))
			.setFlag("bip38", "", Joi.string())
			.setFlag("bip39", "A delegate plain text passphrase. Referred to as BIP39.", Joi.string())
			.setFlag("password", "A custom password that encrypts the BIP39. Referred to as BIP38.", Joi.string())
			.setFlag("skipPrompts", "Skip prompts.", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		const flags: Contracts.AnyObject = { ...this.getFlags() };
		flags.processType = "forger";

		await Utils.buildApplication({
			flags,
			plugins: {
				"@arkecosystem/core-forger": await buildBIP38(flags, this.app.getCorePath("config")),
			},
		});

		// Prevent resolving execute method
		return new Promise(() => {});
	}
}
