import { Commands, Contracts } from "@arkecosystem/core-cli";
import { injectable } from "@arkecosystem/core-container";
import { validateMnemonic } from "bip39";
import { writeJSONSync } from "fs-extra";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "config:forger";

	public description = "Configure the forging validator.";

	public isHidden = true;

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string())
			.setFlag("network", "The name of the network.", Joi.string())
			.setFlag("bip39", "A validator plain text passphrase. Referred to as BIP39.", Joi.string())
			.setFlag("skipValidation", "Skip BIP39 mnemonic validation", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		if (this.hasFlag("bip39")) {
			return this.performConfiguration(this.getFlags());
		}

		const response = await this.components.prompt([
			{
				message: "Please enter your validator plain text passphrase. Referred to as BIP39.",
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
					const validatorsConfig = this.app.getCorePath("config", "validators.json");

					const validators: Record<string, string | string[]> = require(validatorsConfig);
					validators.secrets = [flags.bip39];

					writeJSONSync(validatorsConfig, validators);
				},
				title: "Writing BIP39 passphrase to configuration.",
			},
		]);
	}
}
