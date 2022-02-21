import { Container } from "@arkecosystem/container";
import { BINDINGS } from "@arkecosystem/crypto-contracts";
import { TransactionRegistry } from "@packages/crypto-transaction/distribution";

import { Two } from "./versions/2";

export * from "./builder";

export const init = (container: Container.Container): void => {
	const registry: TransactionRegistry = container.get(BINDINGS.Transaction.Registry);
	registry.registerTransactionType(Two);
};
