import { Contracts } from "@arkecosystem/core-contracts";
import memoize from "fast-memoize";

import {
	registerBlockFactory,
	registerIdentityFactory,
	registerPeerFactory,
	registerRoundFactory,
	registerTransactionFactory,
	registerWalletFactory,
} from "./factories";
import { Factory } from "./factory";
import { FactoryBuilder } from "./factory-builder";

const createFactory = memoize(async (config?: Contracts.Crypto.NetworkConfigPartial): Promise<FactoryBuilder> => {
	const factory: FactoryBuilder = new FactoryBuilder();

	await registerBlockFactory(factory, config);

	await registerIdentityFactory(factory, config);

	registerPeerFactory(factory);

	await registerRoundFactory(factory, config);

	await registerTransactionFactory(factory, config);

	await registerWalletFactory(factory, config);

	return factory;
});

export const factory = async (name: string, config: Contracts.Crypto.NetworkConfigPartial): Promise<Factory> => {
	const factoryBuilder = await createFactory(config);
	return factoryBuilder.get(name);
};
