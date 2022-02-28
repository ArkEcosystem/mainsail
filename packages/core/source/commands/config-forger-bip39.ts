import { Commands, Container, Contracts } from "@arkecosystem/core-cli";
import { validateMnemonic } from "bip39";
import { writeJSONSync } from "fs-extra";
import Joi from "joi";

@Container.injectable()
export class Command extends Commands.Command {
	public signature = "config:forger:bip39";

	public description = "Configure the forging delegate (BIP39).";

	public isHidden = true;

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string())
			.setFlag("network", "The name of the network.", Joi.string())
			.setFlag("bip39", "A delegate plain text passphrase. Referred to as BIP39.", Joi.string())
			.setFlag("skipValidation", "Skip BIP39 mnemonic validation", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		if (this.hasFlag("bip39")) {
			return this.performConfiguration(this.getFlags());
		}

		const response = await this.components.prompt([
			{
				message: "Please enter your delegate plain text passphrase. Referred to as BIP39.",
				name: "bip39",
				type: "password",
				validate: (value) =>
					!validateMnemonic(value) && !this.getFlag("skipValidation")
						? `Failed to verify the given passphrase as BIP39 compliant.`
						: true,
			},
			{
				message: "Can you confirm?",
				name: "confirm",
				type: "confirm",
			},
		]);

		if (response.confirm) {
			return this.performConfiguration({ ...this.getFlags(), ...response });
		}
	}

	private async performConfiguration(flags: Contracts.AnyObject): Promise<void> {
		await this.components.taskList([
			{
				task: () => {
					if (!flags.bip39 || (!validateMnemonic(flags.bip39) && !flags.skipValidation)) {
						throw new Error(`Failed to verify the given passphrase as BIP39 compliant.`);
					}
				},
				title: "Validating passphrase is BIP39 compliant.",
			},
			{
				task: () => {
					const delegatesConfig = this.app.getCorePath("config", "delegates.json");

					const delegates: Record<string, string | string[]> = require(delegatesConfig);
					delegates.secrets = [flags.bip39];
					delete delegates.bip38;

					writeJSONSync(delegatesConfig, delegates);
				},
				title: "Writing BIP39 passphrase to configuration.",
			},
		]);
	}
}
