import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";
import { cpus } from "os";

export const defaults = {
	workerCount: Environment.get(EnvironmentVariables.MAINSAIL_CRYPTO_WORKER_COUNT, cpus().length),
	workerLoggingEnabled: Environment.isTrue(EnvironmentVariables.MAINSAIL_CRYPTO_WORKER_LOGGING_ENABLED),
};
