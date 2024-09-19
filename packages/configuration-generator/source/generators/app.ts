import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { readJSONSync } from "fs-extra/esm";
import { resolve } from "path";

@injectable()
export class AppGenerator {
	generateDefault(packageName = "core"): Contracts.Types.JsonObject {
		packageName = packageName.replace("@mainsail/", "");

		return readJSONSync(
			resolve(new URL(".", import.meta.url).pathname, `../../../${packageName}/bin/config/testnet/core/app.json`),
		);
	}

	generate(options: Contracts.NetworkGenerator.InternalOptions): Contracts.Types.JsonObject {
		return this.generateDefault(options.packageName);
	}
}
