import { constants } from "../../constants";
import { Codecs } from "../codecs";
import { PostTransactionsController } from "../controllers";
import { createPostTransactionsSchema } from "../schemas/post-transactions";
import { Route, RouteConfig } from "./route";

export class PostTransactionsRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/p2p/transactions/postTransactions": {
				codec: Codecs.postTransactions,
				handler: controller.handle,
				id: "p2p.transactions.postTransactions",
				maxBytes: constants.DEFAULT_MAX_PAYLOAD,
				validation: createPostTransactionsSchema(this.app),
			},
		};
	}

	protected getController(): PostTransactionsController {
		return this.app.resolve(PostTransactionsController);
	}
}
