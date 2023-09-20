import { Contracts } from "@mainsail/contracts";

import { ValidatorWallet } from "./validator-wallet";
import { Wallet } from "./wallet";

export const walletFactory = (attributeRepository: Contracts.State.IAttributeRepository) => (address: string) =>
	new Wallet(address, attributeRepository);

export const validatorWalletFactory = (wallet: Contracts.State.Wallet) => new ValidatorWallet(wallet);
