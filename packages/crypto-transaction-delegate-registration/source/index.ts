import { Container } from "@arkecosystem/container";
import { BINDINGS } from "@arkecosystem/crypto-contracts";
import { TransactionRegistry } from "@packages/crypto-transaction/distribution";

import { One } from "./versions/1";
import { Two } from "./versions/2";

export * from "./builder";

export const init = (container: Container.Container): void => {
	const registry: TransactionRegistry = container.get(BINDINGS.Transaction.Registry);
	registry.registerTransactionType(One);
	registry.registerTransactionType(Two);
};
