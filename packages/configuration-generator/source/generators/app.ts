import { injectable } from "@mainsail/container";
import { Types } from "@mainsail/kernel";
import { readJSONSync } from "fs-extra";
import { resolve } from "path";

@injectable()
export class AppGenerator {
	generateDefault(): Types.JsonObject {
		return readJSONSync(resolve(__dirname, "../../../core/bin/config/testnet/app.json"));
	}
}
