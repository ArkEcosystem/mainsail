import { Contracts } from "@arkecosystem/core-contracts";
import { Services } from "@arkecosystem/core-kernel";

import { Wallet } from "./wallet";

export const walletFactory =
	(attributeSet: Services.Attributes.AttributeSet, events?: Contracts.Kernel.EventDispatcher) => (address: string) =>
		new Wallet(address, new Services.Attributes.AttributeMap(attributeSet), events);
