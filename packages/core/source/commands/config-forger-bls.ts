import { Commands, Contracts } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import { readJSONSync, writeJSONSync } from "fs-extra/esm";
import Joi from "joi";

@injectable()
	export class Command extends Commands.Command {
		public signature = "config:forger:bls";

	public description = "Configure the forging validator using BLS12-381 private key.";

	public configure(): void {
		this.definition.setFlag("bls", "A validator BLS12-381 private key.", Joi.string());
	}

	public async execute(): Promise<void> {
		if (this.hasFlag("bls")) {
			return this.performConfiguration(this.getFlags());
		}

		const response = await this.components.prompt([
			{
				message: "Please enter your validator BLS12-381 private key.",
				name: "bls",
				type: "password",
				validate: (value) =>
					!this.#verifyBlsPrivateKey(value) ? `Failed to verify the given key as BLS12-381 compliant.` : true,
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
					if (!flags.bls || !this.#verifyBlsPrivateKey(flags.bls)) {
						throw new Error(`Failed to verify the given key as BLS12-381 compliant.`);
					}
				},
				title: "Validating key is BLS12-381 compliant.",
			},
			{
				task: () => {
					const validatorsConfig = this.app.getCorePath("config", "validators.json");

					const validators: Record<string, string | string[]> = readJSONSync(validatorsConfig);
					validators.secrets = [flags.bls];

					writeJSONSync(validatorsConfig, validators);
				},
				title: "Writing BLS12-381 key to configuration.",
			},
		]);
	}

	#verifyBlsPrivateKey(key: string): boolean {
		return /^[0-9a-fA-F]{64}$/.test(key);
	}
}
