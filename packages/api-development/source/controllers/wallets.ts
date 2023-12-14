import { notFound } from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { WalletResource } from "../resources";
import { Controller } from "./controller";

@injectable()
export class WalletsController extends Controller {
	public index(request: Hapi.Request) {
		const wallets = this.getWalletRepository().allByAddress();

		const pagination = this.getQueryPagination(request.query);

		return this.toPagination(
			{
				results: wallets.slice(pagination.offset, pagination.offset + pagination.limit),
				totalCount: wallets.length,
			},
			WalletResource,
			true,
		);
	}

	public async show(request: Hapi.Request): Promise<any> {
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

		if (!wallet) {
			return notFound("Wallet not found");
		}

		return this.toResource(wallet, WalletResource, true);
	}
}
