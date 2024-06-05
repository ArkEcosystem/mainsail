import { Contracts } from "@mainsail/contracts";

import { StateRepository } from "./state-repository.js";

export const stateRepositoryFactory =
	({ container }) =>
	(
		attributeRepository: Contracts.State.AttributeRepository,
		originalRepository?: Contracts.State.StateRepository,
		initialData?: Record<string, unknown>,
	) =>
		container.resolve(StateRepository).configure(attributeRepository, originalRepository, initialData);
