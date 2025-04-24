import { Constants } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	enabled: Environment.isTrue(Constants.EnvironmentVariables.CORE_API_SYNC_ENABLED),
	syncInterval: Environment.get<number>(Constants.EnvironmentVariables.CORE_API_SYNC_INTERVAL, 8000),
};
