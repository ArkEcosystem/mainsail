import { Constants } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	mockFakeValidatorBlsKeys: Environment.isTrue(
		Constants.EnvironmentVariables.CORE_SNAPSHOT_MOCK_FAKE_VALIDATOR_BLS_KEYS,
	),
};
