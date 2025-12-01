import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	mockFakeValidatorBlsKeys: Environment.isTrue(EnvironmentVariables.MAINSAIL_SNAPSHOT_MOCK_FAKE_VALIDATOR_BLS_KEYS),
};
