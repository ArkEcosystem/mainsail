import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	enabled: Environment.isTrue(EnvironmentVariables.MAINSAIL_API_SYNC_ENABLED),
	syncInterval: Environment.get<number>(EnvironmentVariables.MAINSAIL_API_SYNC_INTERVAL, 8000),
};
