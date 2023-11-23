import { Boom, notFound } from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { WalletResource } from "../resources";
import { Controller } from "./controller";

@injectable()
export class DelegatesController extends Controller {
	public index(request: Hapi.Request) {
		const wallets = this.getWalletRepository().allValidators();

		const pagination = this.getQueryPagination(request.query);

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: wallets.slice(pagination.offset, pagination.offset + pagination.limit),
				totalCount: wallets.length,
			},
			WalletResource,
			true,
		);
	}

	public async show(request: Hapi.Request): Promise<any | Boom> {
		const walletId = request.params.id as string;

		let wallet: Contracts.State.Wallet | undefined;

		const walletRepository = this.getWalletRepository();
		if (walletRepository.hasByAddress(walletId)) {
			wallet = walletRepository.findByAddress(walletId);
		} else if (walletRepository.hasByPublicKey(walletId)) {
			wallet = await walletRepository.findByPublicKey(walletId);
		} else if (walletRepository.hasByUsername(walletId)) {
			wallet = walletRepository.findByUsername(walletId);
		}

		if (!wallet || !wallet.isValidator()) {
			return notFound("Wallet not found");
		}

		return this.toResource(wallet, WalletResource, true);
	}
}
