import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums } from "@mainsail/kernel";
import { Sandbox } from "@mainsail/test-framework";

import { Validators } from "./contracts.ts";

export const prepareNodeValidators = (validators: Validators, nodeIndex: number, totalNodes: number) => {
	const secrets = validators.secrets;
	const sliceSize = Math.ceil(secrets.length / totalNodes);
	const nodeSecrets = secrets.slice(sliceSize * nodeIndex, sliceSize * (nodeIndex + 1));

	return {
		secrets: nodeSecrets,
	};
};

export const snoozeForBlock = async (sandbox: Sandbox | Sandbox[]): Promise<void> => {
	const function_ = async (sandbox: Sandbox): Promise<void> =>
		new Promise((resolve) => {
			sandbox.app
				.get<Contracts.Kernel.EventDispatcher>(Identifiers.Services.EventDispatcher.Service)
				.listenOnce(Enums.BlockEvent.Applied, { handle: () => resolve() });
		});

	if (Array.isArray(sandbox)) {
		await Promise.all(sandbox.map((s) => function_(s)));
	} else {
		await function_(sandbox);
	}
};

export const getLatestBlock = async (sandbox: Sandbox): Promise<Contracts.Crypto.Block | undefined> =>
	sandbox.app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service).getLastBlock();
