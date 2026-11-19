import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	// Nodes the operator names; they are checked like any other but may have a non-public address.
	apiNodes: Environment.get<undefined>(EnvironmentVariables.MAINSAIL_P2P_API_NODES)?.split(",") ?? [],
	// Largest answer read from an API node during a check.
	apiNodesMaxContentLength: Environment.get(EnvironmentVariables.MAINSAIL_P2P_API_NODES_MAX_CONTENT_LENGTH, 25_000),
};
