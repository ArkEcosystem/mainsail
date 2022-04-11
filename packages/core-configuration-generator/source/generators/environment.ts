import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";

import { EnviromentData } from "../contracts";

@injectable()
export class EnvironmentGenerator {
	#data: EnviromentData = {};

	addInitialRecords(): EnvironmentGenerator {
		this.#data = {
			CORE_LOG_LEVEL: "info",
			CORE_LOG_LEVEL_FILE: "info",
			CORE_P2P_HOST: "0.0.0.0",
			CORE_P2P_PORT: 4000,
			CORE_WEBHOOKS_HOST: "0.0.0.0",
			CORE_WEBHOOKS_PORT: 4004,
		};

		return this;
	}

	addRecord(key: Contracts.Flags.Flag, value: string | number): EnvironmentGenerator {
		this.#data[key] = value;

		return this;
	}

	addRecords(data: EnviromentData): EnvironmentGenerator {
		for (const [key, value] of Object.entries(data)) {
			this.addRecord(key as Contracts.Flags.Flag, value);
		}

		return this;
	}

	generate(): EnviromentData {
		return this.#data;
	}
}
