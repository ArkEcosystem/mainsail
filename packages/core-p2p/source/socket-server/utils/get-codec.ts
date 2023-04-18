import { Contracts } from "@arkecosystem/core-contracts";

import {
	GetBlocksRoute,
	GetCommonBlocksRoute,
	GetPeersRoute,
	GetStausRoute,
	PostBlockRoute,
	PostTransactionsRoute,
} from "../routes";
import { Codec } from "../routes/route";

export const getCodec = (app: Contracts.Kernel.Application, event: string): Codec => {
	const allRoutesConfigByPath = {
		...app.resolve(GetBlocksRoute).getRoutesConfigByPath(),
		...app.resolve(GetCommonBlocksRoute).getRoutesConfigByPath(),
		...app.resolve(GetPeersRoute).getRoutesConfigByPath(),
		...app.resolve(GetStausRoute).getRoutesConfigByPath(),
		...app.resolve(PostBlockRoute).getRoutesConfigByPath(),
		...app.resolve(PostTransactionsRoute).getRoutesConfigByPath(),
	};

	const codecByEvent = {};
	for (const routeConfig of Object.values(allRoutesConfigByPath)) {
		codecByEvent[routeConfig.id] = routeConfig.codec;
	}

	return codecByEvent[event];
};
