import Hapi from "@hapi/hapi";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { Controller } from "./controller";
import { WalletResource } from "../resources/wallet";

@injectable()
export class WalletsController extends Controller {
    @inject(ApiDatabaseIdentifiers.WalletRepository)
    private readonly walletRepository!: ApiDatabaseContracts.IWalletRepository;

    public async index(request: Hapi.Request, h: Hapi.ResponseToolkit) {
        const pagination = this.getQueryPagination(request.query);

        const [wallets, totalCount] = await this.walletRepository
            .createQueryBuilder()
            .select()
            .addOrderBy("balance", "DESC")
            .offset(pagination.offset)
            .limit(pagination.limit)
            .getManyAndCount();

        return this.toPagination(
            {
                meta: { totalCountIsEstimate: false },
                results: wallets,
                totalCount,
            },
            WalletResource,
            false,
        );
    }
}
