import { constants } from "../../constants";
import { postTransactions } from "../codecs/transactions";
import { PostTransactionsController } from "../controllers";
import { transactionsSchemas } from "../schemas/transactions";
import { Route, RouteConfig } from "./route";

export class PostTransactionsRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/p2p/transactions/postTransactions": {
				codec: postTransactions,
				handler: controller.handle,
				id: "p2p.transactions.postTransactions",
				maxBytes: constants.DEFAULT_MAX_PAYLOAD,
				validation: transactionsSchemas.createPostTransactionsSchema(this.app),
			},
		};
	}

	protected getController(): PostTransactionsController {
		return this.app.resolve(PostTransactionsController);
	}
}
