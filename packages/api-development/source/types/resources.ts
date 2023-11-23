import { BigNumber } from "@mainsail/utils";

export type WalletResource = {
	address: string;
	publicKey?: string;
	username?: string;
	balance: BigNumber;
	nonce: BigNumber;
	attributes: object;
};
