import { Contracts } from "@mainsail/contracts";
import { Services } from "@mainsail/kernel";

import { ValidatorWallet } from "./validator-wallet";
import { Wallet } from "./wallet";

export const walletFactory =
	(attributeSet: Services.Attributes.AttributeSet, events?: Contracts.Kernel.EventDispatcher) => (address: string) =>
		new Wallet(address, new Services.Attributes.AttributeMap(attributeSet), events);

export const validatorWalletFactory = (wallet: Contracts.State.Wallet) => new ValidatorWallet(wallet);
