import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { Types } from "@arkecosystem/core-kernel";
import { stringifySync } from "envfile";
import { writeFileSync, writeJSONSync } from "fs-extra";
import path from "path";

import { EnviromentData, Wallet } from "./contracts";
import { Identifiers } from "./identifiers";

@injectable()
export class ConfigurationWriter {
	@inject(Identifiers.ConfigurationPath)
	private configurationPath: string;

	writeApp(appData: Types.JsonObject): void {
		writeJSONSync(path.join(this.configurationPath, "app.json"), appData, {
			spaces: 4,
		});
	}

	writeEnvironment(environment: EnviromentData): void {
		writeFileSync(path.join(this.configurationPath, ".env"), stringifySync(environment));
	}

	writePeers(peers: { port: number; ip: string }[]) {
		writeJSONSync(
			path.join(this.configurationPath, "peers.json"),
			{ list: peers },
			{
				spaces: 4,
			},
		);
	}

	writeGenesisWallet(wallet: Wallet): void {
		writeJSONSync(path.join(this.configurationPath, "genesis-wallet.json"), wallet, {
			spaces: 4,
		});
	}

	writeValidators(mnemonics: string[]): void {
		writeJSONSync(
			path.join(this.configurationPath, "validators.json"),
			{
				secrets: mnemonics,
			},
			{
				spaces: 4,
			},
		);
	}

	writeCrypto(
		genesisBlock: Contracts.Crypto.IBlockData,
		milestones: Partial<Contracts.Crypto.Milestone>[],
		network: Contracts.Crypto.Network,
	): void {
		writeJSONSync(
			path.join(this.configurationPath, "crypto.json"),
			{
				genesisBlock,
				milestones,
				network,
			},
			{
				spaces: 4,
			},
		);
	}
}
