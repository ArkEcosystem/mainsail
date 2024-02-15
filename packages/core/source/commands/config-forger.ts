import { Commands } from "@mainsail/cli";
import { injectable, interfaces } from "@mainsail/container";
import Joi from "joi";

import { Command as BIP38Command } from "./config-forger-bip38";
import { Command as BIP39Command } from "./config-forger-bip39";

@injectable()
export class Command extends Commands.Command {
	public signature = "config:forger";

	public description = "Configure the forging validator.";

	public configure(): void {
		this.definition
			.setFlag("bip39", "A validator plain text passphrase. Referred to as BIP39.", Joi.string())
			.setFlag("password", "A custom password that encrypts the BIP39. Referred to as BIP38.", Joi.string())
			.setFlag(
				"method",
				"The configuration method to use (BIP38 or BIP39).",
				Joi.string().valid("bip38", "bip39"),
			)
			.setFlag("skipValidation", "Skip BIP39 mnemonic validation", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		let method = this.getFlag("method");
		if (!method) {
			const response = await this.components.prompt([
				{
					choices: [
						{ title: "Encrypted BIP38 (Recommended)", value: "bip38" },
						{ title: "Plain BIP39", value: "bip39" },
					],
					message: "Please select how you wish to store your delegate passphrase?",
					name: "method",
					type: "select",
				},
			]);

			method = response.method;
			if (!method) {
				this.components.fatal("Please enter valid data and try again!");
			}
		}

		if (method === "bip38") {
			return this.initializeAndExecute(BIP38Command);
		}

		if (method === "bip39") {
			return this.initializeAndExecute(BIP39Command);
		}
	}

	private async initializeAndExecute(commandSignature: interfaces.Newable<Commands.Command>): Promise<void> {
		const cmd = this.app.resolve(commandSignature);

		const flags = this.getFlags();
		cmd.configure();
		cmd.register([]);

		for (const flag in flags) {
			cmd.setFlag(flag, flags[flag]);
		}

		return await cmd.run();
	}
}
