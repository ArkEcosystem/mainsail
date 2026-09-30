import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";
import { readJSONSync } from "fs-extra/esm";
import { resolve } from "path";

@injectable()
export class AppGenerator {
	generateDefault(packageName: string = "core"): Contracts.Types.JsonObject {
		packageName = packageName.replace("@mainsail/", "");

		return readJSONSync(
			resolve(new URL(".", import.meta.url).pathname, `../../../${packageName}/bin/config/devnet/core/app.json`),
		);
	}

	generate(options: Contracts.NetworkGenerator.InternalOptions): Contracts.Types.JsonObject {
		const appJson = this.generateDefault(options.packageName);

		if (options.snapshot) {
			const main = appJson.main as { package: string }[];
			const importerPackage = "@mainsail/snapshot-legacy-importer";
			const statePackage = "@mainsail/state";

			// Only register the importer if the template does not already include it
			if (!main.some((plugin) => plugin.package === importerPackage)) {
				const index = main.findIndex((plugin) => plugin.package === statePackage);

				if (index === -1) {
					throw new Error(
						`cannot register "${importerPackage}": "${statePackage}" not found in app.json "main" plugins`,
					);
				}

				main.splice(index, 0, { package: importerPackage });
			}
		}

		return appJson;
	}
}
