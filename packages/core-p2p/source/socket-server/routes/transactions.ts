import { constants } from "../../constants";
import { postTransactions } from "../codecs/transactions";
import { TransactionsController } from "../controllers/transactions";
import { transactionsSchemas } from "../schemas/transactions";
import { Route, RouteConfig } from "./route";

export class TransactionsRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/p2p/transactions/postTransactions": {
				codec: postTransactions,
				handler: controller.postTransactions,
				id: "p2p.transactions.postTransactions",
				maxBytes: constants.DEFAULT_MAX_PAYLOAD,
				validation: transactionsSchemas.createPostTransactionsSchema(this.app),
			},
		};
	}

	protected getController(): TransactionsController {
		return this.app.resolve(TransactionsController);
	}
}
