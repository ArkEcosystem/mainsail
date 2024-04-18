import { Commands, Contracts } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import { validateMnemonic } from "bip39";
import { readJSONSync, writeJSONSync } from "fs-extra/esm";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "config:forger:bip38";

	public description = "Configure the forging validator (BIP38).";

	public isHidden = true;

	public configure(): void {
		this.definition
			.setFlag("bip39", "A validator plain text passphrase. Referred to as BIP39.", Joi.string())
			.setFlag("password", "A custom password that encrypts the BIP39. Referred to as BIP38.", Joi.string());
	}

	public async execute(): Promise<void> {
		if (this.hasFlag("bip39") && this.hasFlag("password")) {
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
				message: "Please enter your custom password that encrypts the BIP39. Referred to as BIP38.",
				name: "password",
				type: "password",
				validate: (value) => (typeof value !== "string" ? "The BIP38 password has to be a string." : true),
			},
		]);

		await this.components.prompt([
			{
				message: "Confirm custom password that encrypts the BIP39. Referred to as BIP38.",
				name: "passwordConfirmation",
				type: "password",
				validate: (value) =>
					value !== response.password ? "Confirm password does not match BIP38 password." : true,
			},
		]);

		if (!response.bip39) {
			throw new Error("Failed to verify the given passphrase as BIP39 compliant.");
		}

		if (!response.password) {
			throw new Error("The BIP38 password has to be a string.");
		}

		return this.performConfiguration({ ...this.getFlags(), ...response });
	}

	private async performConfiguration(flags: Contracts.AnyObject): Promise<void> {
		//let decodedWIF;

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
					// decodedWIF = wif.decode(Identities.WIF.fromPassphrase(flags.bip39));
				},
				title: "Loading private key.",
			},
			{
				task: () => {
					const validatorsConfig = this.app.getCorePath("config", "validators.json");

					const validators: Record<string, string | string[]> = readJSONSync(validatorsConfig);
					// validators.bip38 = bip38.encrypt(
					//     decodedWIF.privateKey,
					//     decodedWIF.compressed,
					//     flags.password,
					// );
					validators.secrets = [];

					writeJSONSync(validatorsConfig, validators);
				},
				title: "Writing BIP39 passphrase to configuration.",
			},
		]);
	}
}
