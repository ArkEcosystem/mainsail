import { injectable } from "@mainsail/container";
import { Utils } from "@mainsail/kernel";
import { Contracts, Exceptions } from "@mainsail/contracts";
import { readJSONSync } from "fs-extra";
import { resolve } from "path";

interface PluginEntry {
	package: string;
}

@injectable()
export class AppGenerator {
	generateDefault(): Contracts.Types.JsonObject {
		return readJSONSync(resolve(__dirname, "../../../core/bin/config/testnet/app.json"));
	}

	generate(options: Contracts.NetworkGenerator.InternalOptions): Contracts.Types.JsonObject {
		const template = this.generateDefault();

		// This isn't very sophisticated, but here we ensure the correct 'address' package is part 
		// of the app.json depending on 'options'. A more generic approach would be to read all loaded container plugins.
		const plugins = template.plugins as unknown as PluginEntry[];
		const regex = /^@mainsail\/crypto-address-[\w]+$/;
		const addressPackage = plugins.find(entry => regex.test(entry.package));
		Utils.assert.defined<PluginEntry>(addressPackage);

		if ("bech32m" in options.address) {

			addressPackage.package = "@mainsail/crypto-address-bech32m";

		} else if ("base58" in options.address) {

			addressPackage.package = "@mainsail/crypto-address-base58";

		} else {
			throw new Exceptions.NotImplemented(this.constructor.name, "generate");
		}

		return template;
	}
}
