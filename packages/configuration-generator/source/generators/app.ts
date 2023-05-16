import { Contracts } from "@mainsail/contracts";
import { readJSONSync } from "fs-extra";
import { resolve } from "path";

@injectable()
export class AppGenerator {
	generateDefault(): Contracts.Types.JsonObject {
		return readJSONSync(resolve(__dirname, "../../../core/bin/config/testnet/app.json"));
	}
}
