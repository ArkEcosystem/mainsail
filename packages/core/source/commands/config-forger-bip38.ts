import { Commands, Identifiers as CliIdentifiers, Contracts } from "@mainsail/cli";
import { Identifiers, Contracts as AppContracts } from "@mainsail/contracts";
import { injectable } from "@mainsail/container";
import { makeApplication } from "@mainsail/configuration-generator";
import { validateMnemonic } from "bip39";
import { writeJSONSync } from "fs-extra";
import Joi from "joi";
import envPaths from "env-paths";
import path from "path";

@injectable()
export class Command extends Commands.Command {
    public signature = "config:forger:bip38";

    public description = "Configure the forging validator (BIP38).";

    public configure(): void {
        this.definition
            .setFlag("token", "The name of the token.", Joi.string())
            .setFlag("network", "The name of the network.", Joi.string())
            .setFlag("wif", "The wif of the network.", Joi.number().default(186))
            .setFlag("bip39", "A validator plain text passphrase. Referred to as BIP39.", Joi.string())
            .setFlag("password", "A custom password that encrypts the BIP39. Referred to as BIP38.", Joi.string())
            .setFlag("skipValidation", "Skip BIP39 mnemonic validation", Joi.boolean().default(false));
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
                    !validateMnemonic(value) && !this.getFlag("skipValidation")
                        ? `Failed to verify the given passphrase as BIP39 compliant.`
                        : true,
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
        let decodedWIF;

        flags = {
            ...flags,
            packageName: this.app.get<AppContracts.Types.PackageJson>(CliIdentifiers.Package).name,
        }
        const cryptoApp = await makeApplication(this.#getConfigurationPath(flags), flags);
        cryptoApp.get<AppContracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setConfig({
            // @ts-ignore
            network: { wif: flags.wif }, milestones: [],
        })

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
                title: "Loading private key.",
                task: async () => {
                    decodedWIF = await cryptoApp.get<AppContracts.Crypto.WIFFactory>(Identifiers.Cryptography.Identity.Wif.Factory).fromMnemonic(flags.bip39);
                },
            },
            {
                task: () => {
                    const validatorsConfig = this.app.getCorePath("config", "validators.json");
                    const validators: Record<string, string | string[]> = require(validatorsConfig);
                    validators.bip38 = cryptoApp.get<AppContracts.Crypto.BIP38>(Identifiers.Cryptography.BIP38).encrypt(
                        // decodedWIF.privateKey,
                        // decodedWIF.compressed,
                        decodedWIF,
                        false,
                        flags.password,
                    );
                    validators.secrets = [];

                    writeJSONSync(validatorsConfig, validators);
                },
                title: "Writing BIP39 passphrase to configuration.",
            },
        ]);
    }

    #getConfigurationPath(options: Record<string, any>): string {
        const paths = envPaths(options.token, { suffix: "core" });
        return path.join(paths.config, options.network, "mainsail");
    }
}
