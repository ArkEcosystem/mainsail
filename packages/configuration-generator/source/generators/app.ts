import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { readJSONSync } from "fs-extra/esm";
import { resolve } from "path";

@injectable()
export class AppGenerator {
	generateDefault(packageName = "core"): Contracts.Types.JsonObject {
		packageName = packageName.replace("@mainsail/", "");

		return readJSONSync(
			resolve(new URL(".", import.meta.url).pathname, `../../../${packageName}/bin/config/devnet/core/app.json`),
		);
	}

	generate(options: Contracts.NetworkGenerator.InternalOptions): Contracts.Types.JsonObject {
		const appJson = this.generateDefault(options.packageName);

		if (options.snapshot) {
			// @ts-ignore
			const index = appJson.main.findIndex((p) => p.package === "@mainsail/state");
			// @ts-ignore
			appJson.main.splice(index, 0, { package: "@mainsail/snapshot-legacy-importer" });
		}

		return appJson;
	}
}
