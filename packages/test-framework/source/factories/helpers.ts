import { Contracts } from "@mainsail/contracts";
import memoize from "fast-memoize";

import { registerBlockFactory, registerIdentityFactory, registerTransactionFactory } from "./factories/index.js";
import { Factory } from "./factory.js";
import { FactoryBuilder } from "./factory-builder.js";

const createFactory = memoize.default(
	async (config?: Contracts.Crypto.NetworkConfigPartial): Promise<FactoryBuilder> => {
		const factory: FactoryBuilder = new FactoryBuilder();

		await registerBlockFactory(factory, config);

		await registerIdentityFactory(factory, config);

		await registerTransactionFactory(factory, config);

		return factory;
	},
);

export const factory = async (name: string, config: Contracts.Crypto.NetworkConfigPartial): Promise<Factory> => {
	const factoryBuilder = await createFactory(config);
	return factoryBuilder.get(name);
};
