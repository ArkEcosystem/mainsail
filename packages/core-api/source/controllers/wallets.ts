import { inject, injectable, tagged } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Boom, notFound } from "@hapi/boom";
import Hapi from "@hapi/hapi";

import { WalletResource } from "../resources";
import { Controller } from "./controller";

@injectable()
export class WalletsController extends Controller {
	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private readonly walletRepository!: Contracts.State.WalletRepository;

	public index(request: Hapi.Request) {
		const wallets = this.walletRepository.allByAddress();

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: wallets.slice(
					this.getOffset(request.query),
					this.getOffset(request.query) + request.query.limit,
				),
				totalCount: wallets.length,
			},
			WalletResource,
			true,
		);
	}

	public async show(request: Hapi.Request): Promise<any | Boom> {
		const walletId = request.params.id as string;

		let wallet: Contracts.State.Wallet | undefined;

		if (this.walletRepository.hasByAddress(walletId)) {
			wallet = this.walletRepository.findByAddress(walletId);
		} else if (this.walletRepository.hasByPublicKey(walletId)) {
			wallet = await this.walletRepository.findByPublicKey(walletId);
		} else if (this.walletRepository.hasByUsername(walletId)) {
			wallet = this.walletRepository.findByUsername(walletId);
		}

		if (!wallet) {
			return notFound("Wallet not found");
		}

		return this.toResource(wallet, WalletResource, false);
	}
}
