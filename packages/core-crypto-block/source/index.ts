import { Container } from "@arkecosystem/container";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { BINDINGS, IBlock } from "@arkecosystem/core-crypto-contracts";

import { Block } from "./block";
import { INTERNAL_FACTORY } from "./container";

export * from "./block";
export * from "./deserializer";
export * from "./factory";
export * from "./serializer";

export const createBlockPackage = (container: Container.Container) => {
	container
		.bind(INTERNAL_FACTORY)
		.toFactory<IBlock>(
			(context: Container.interfaces.Context) => (data) =>
				new Block(context.container.get<Configuration>(BINDINGS.Configuration), data),
		);

	return {};
};
