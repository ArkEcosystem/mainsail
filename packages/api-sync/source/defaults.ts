import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	enabled: Environment.isTrue(EnvironmentVariables.MAINSAIL_API_SYNC_ENABLED),
	syncInterval: Environment.get<number>(EnvironmentVariables.MAINSAIL_API_SYNC_INTERVAL, 8000),
	tokenCacheSize: Environment.get<number>(EnvironmentVariables.MAINSAIL_API_SYNC_TOKEN_CACHE_SIZE, 256),
	tokenWhitelistRefreshInterval: Environment.get<number>(EnvironmentVariables.MAINSAIL_API_SYNC_TOKEN_WHITELIST_SYNC_INTERVAL, 1000 * 60),
	tokenWhitelistRemoteUrl: Environment.get<string>(EnvironmentVariables.MAINSAIL_API_SYNC_TOKEN_WHITELIST_REMOTE_URL, ""),
};
