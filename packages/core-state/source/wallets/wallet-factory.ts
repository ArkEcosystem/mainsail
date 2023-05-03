import { Contracts } from "@mainsail/core-contracts";
import { Services } from "@mainsail/core-kernel";

import { Wallet } from "./wallet";

export const walletFactory =
	(attributeSet: Services.Attributes.AttributeSet, events?: Contracts.Kernel.EventDispatcher) => (address: string) =>
		new Wallet(address, new Services.Attributes.AttributeMap(attributeSet), events);
