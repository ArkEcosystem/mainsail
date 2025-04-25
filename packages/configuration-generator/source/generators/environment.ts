import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { EnvironmentData } from "../contracts.js";

@injectable()
export class EnvironmentGenerator {
	#data: EnvironmentData = {};

	addInitialRecords(): EnvironmentGenerator {
		this.#data = {
			MAINSAIL_LOG_LEVEL: "info",
			MAINSAIL_LOG_LEVEL_FILE: "info",
			MAINSAIL_P2P_HOST: "0.0.0.0",
			MAINSAIL_P2P_PORT: 4000,
			MAINSAIL_WEBHOOKS_HOST: "0.0.0.0",
			MAINSAIL_WEBHOOKS_PORT: 4004,
		};

		return this;
	}

	addRecord(key: Contracts.Kernel.EnvironmentVariable, value: string | number): EnvironmentGenerator {
		this.#data[key] = value;

		return this;
	}

	addRecords(data: EnvironmentData): EnvironmentGenerator {
		for (const [key, value] of Object.entries(data)) {
			this.addRecord(key as Contracts.Kernel.EnvironmentVariable, value);
		}

		return this;
	}

	generate(): EnvironmentData {
		return this.#data;
	}
}
