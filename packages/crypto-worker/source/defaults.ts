import { Constants } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	workerCount: Environment.get(Constants.Flags.CORE_CRYPTO_WORKER_COUNT, 2),
};
