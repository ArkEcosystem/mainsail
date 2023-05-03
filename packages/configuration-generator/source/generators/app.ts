import { injectable } from "@mainsail/core-container";
import { Types } from "@mainsail/core-kernel";
import { readJSONSync } from "fs-extra";
import { resolve } from "path";

@injectable()
export class AppGenerator {
	generateDefault(): Types.JsonObject {
		return readJSONSync(resolve(__dirname, "../../../core/bin/config/testnet/app.json"));
	}
}
