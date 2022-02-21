import { Container } from "@arkecosystem/container";
import { BINDINGS, IBlock } from "@arkecosystem/crypto-contracts";
import { Configuration } from "@packages/crypto-config/distribution";
import { INTERNAL_FACTORY } from "./container";
import { Block } from "./block";

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
