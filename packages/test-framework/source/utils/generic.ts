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
	app.get<Contracts.State.Service>(Identifiers.State.Service).getStore().getLastHeight();

export const getWalletNonce = async (app: Contracts.Kernel.Application, publicKey: string): Promise<BigNumber> =>
	(
		await app
			.get<Contracts.State.Service>(Identifiers.State.Service)
			.getWalletRepository()
			.findByPublicKey(publicKey)
	).getNonce();
