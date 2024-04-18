import { Keystore } from "@chainsafe/bls-keystore";
import { Commands, Contracts } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import { ServiceProvider as CryptoServiceProvider } from "@mainsail/crypto-config";
import { KeyPairFactory } from "@mainsail/crypto-key-pair-bls12-381";
import { validateMnemonic } from "bip39";
import { writeJSONSync } from "fs-extra/esm";
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
		let keystore: Keystore | undefined;

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
				task: async () => {
					await this.app.resolve(CryptoServiceProvider).register();

					const keyPair = await this.app.resolve(KeyPairFactory).fromMnemonic(flags.bip39);

					keystore = await Keystore.create(
						flags.password,
						Buffer.from(keyPair.privateKey, "hex"),
						Buffer.from(keyPair.publicKey, "hex"),
						"",
					);
				},
				title: "Loading keystore.",
			},
			{
				task: () => {
					if (!keystore) {
						throw new Error("missing keystore");
					}

					const validatorsConfig = this.app.getCorePath("config", "validators.json");
					writeJSONSync(validatorsConfig, { secrets: [], keystore: keystore.stringify() }, { spaces: 2 });
				},
				title: "Writing encrypted BIP39 passphrase to configuration.",
			},
		]);
	}
}
