import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

export const getLastHeight = (app: Contracts.Kernel.Application): number =>
	app.get<Contracts.State.Store>(Identifiers.State.Store).getBlockNumber();

export const getWalletNonce = async (app: Contracts.Kernel.Application, publicKey: string): Promise<BigNumber> =>
	BigNumber.ZERO;
