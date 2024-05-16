import { Constants } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	host: Environment.get(Constants.EnvironmentVariables.CORE_TRANSACTION_POOL_SERVER_HOST, "127.0.0.1"),
	port: Environment.get(Constants.EnvironmentVariables.CORE_TRANSACTION_POOL_SERVER_PORT, 4009),
};
