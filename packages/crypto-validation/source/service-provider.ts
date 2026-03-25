import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { makeKeywords } from "./keywords.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.#registerKeywords();
	}

	#registerKeywords(): void {
		for (const keyword of Object.values(
			makeKeywords(this.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)),
		)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addKeyword(keyword);
		}
	}
}
