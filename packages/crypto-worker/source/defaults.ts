import { Constants } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";
import { cpus } from "os";

export const defaults = {
	workerCount: Environment.get(Constants.EnvironmentVariables.CORE_CRYPTO_WORKER_COUNT, cpus().length),
	workerLoggingEnabled: Environment.isTrue(Constants.EnvironmentVariables.CORE_CRYPTO_WORKER_LOGGING_ENABLED),
};
