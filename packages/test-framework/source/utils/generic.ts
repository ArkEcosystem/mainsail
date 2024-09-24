import { Contracts, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";
import cloneDeep from "lodash.clonedeep";

export const injectMilestone = (
	index: number,
	milestone: Record<string, any>,
	configuration: Contracts.Crypto.Configuration,
): void =>
	(configuration as any).milestones.splice(index, 0, {
		...cloneDeep(configuration.getMilestone()),
		...milestone,
	});

export const getLastHeight = (app: Contracts.Kernel.Application): number =>
	app.get<Contracts.State.Store>(Identifiers.State.Store).getLastHeight();

export const getWalletNonce = async (app: Contracts.Kernel.Application, publicKey: string): Promise<BigNumber> => BigNumber.ZERO;
