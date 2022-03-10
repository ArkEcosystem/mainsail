import { Commands, Container, Contracts } from "@arkecosystem/core-cli";
import { Crypto, Identities, Managers, Networks } from "@arkecosystem/crypto";
import { validateMnemonic } from "bip39";
import { writeJSONSync } from "fs-extra";
import Joi from "joi";
import wif from "wif";

@Container.injectable()
export class Command extends Commands.Command {
	public signature = "config:forger:bip38";

	public description = "Configure the forging delegate (BIP38).";

	public isHidden = true;

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string().default("ark"))
			.setFlag("network", "The name of the network.", Joi.string().valid(...Object.keys(Networks)))
			.setFlag("bip39", "A delegate plain text passphrase. Referred to as BIP39.", Joi.string())
			.setFlag("password", "A custom password that encrypts the BIP39. Referred to as BIP38.", Joi.string())
			.setFlag("skipValidation", "Skip BIP39 mnemonic validation", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		if (this.hasFlag("bip39") && this.hasFlag("password")) {
			return this.performConfiguration(this.getFlags());
		}

		const response = await this.components.prompt([
			{
				message: "Please enter your delegate plain text passphrase. Referred to as BIP39.",
				name: "bip39",
				type: "password",
				validate: (value) =>
					/* c8 ignore next 3 */
					!validateMnemonic(value) && !this.getFlag("skipValidation")
						? "Failed to verify the given passphrase as BIP39 compliant."
						: true,
			},
			{
				message: "Please enter your custom password that encrypts the BIP39. Referred to as BIP38.",
				name: "password",
				type: "password",
				validate: (value) =>
					/* c8 ignore next */
					typeof value !== "string" ? "The BIP38 password has to be a string." : true,
			},
		]);

		await this.components.prompt([
			{
				message: "Confirm custom password that encrypts the BIP39. Referred to as BIP38.",
				name: "passwordConfirmation",
				type: "password",
				validate: (value) =>
					/* c8 ignore next */
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
		let decodedWIF;

		await this.components.taskList([
			{
				task: () => {
					if (!validateMnemonic(flags.bip39) && !flags.skipValidation) {
						throw new Error(`Failed to verify the given passphrase as BIP39 compliant.`);
					}
				},
				title: "Validating passphrase is BIP39 compliant.",
			},
			{
				task: () => {
					Managers.configManager.setFromPreset(flags.network);
				},
				title: "Prepare crypto.",
			},
			{
				task: () => {
					// @ts-ignore
					decodedWIF = wif.decode(Identities.WIF.fromPassphrase(flags.bip39));
				},
				title: "Loading private key.",
			},
			{
				task: () => {
					const delegatesConfig = this.app.getCorePath("config", "delegates.json");

					const delegates = require(delegatesConfig);
					delegates.bip38 = Crypto.bip38.encrypt(
						decodedWIF.privateKey,
						decodedWIF.compressed,
						flags.password,
					);
					delegates.secrets = [];

					writeJSONSync(delegatesConfig, delegates);
				},
				title: "Encrypting BIP39 passphrase.",
			},
		]);
	}
}
