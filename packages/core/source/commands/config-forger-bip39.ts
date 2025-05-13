import { Commands, Contracts } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import { validateMnemonic } from "bip39";
import { readJSONSync, writeJSONSync } from "fs-extra/esm";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "config:forger:bip39";

	public description = "Configure the forging validator (BIP39).";

	public configure(): void {
		this.definition.setFlag("bip39", "A validator plain text passphrase. Referred to as BIP39.", Joi.string());
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
					!validateMnemonic(value) ? `Failed to verify the given passphrase as BIP39 compliant.` : true,
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
					if (!flags.bip39 || !validateMnemonic(flags.bip39)) {
						throw new Error(`Failed to verify the given passphrase as BIP39 compliant.`);
					}
				},
				title: "Validating passphrase is BIP39 compliant.",
			},
			{
				task: () => {
					const validatorsConfig = this.app.getCorePath("config", "validators.json");

					const validators: Record<string, string | string[]> = readJSONSync(validatorsConfig);
					validators.secrets = [flags.bip39];

					writeJSONSync(validatorsConfig, validators);
				},
				title: "Writing BIP39 passphrase to configuration.",
			},
		]);
	}
}
