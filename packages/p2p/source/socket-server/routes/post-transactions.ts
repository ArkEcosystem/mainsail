import { constants } from "../../constants.js";
import { Routes } from "../../enums.js";
import { Codecs } from "../codecs/index.js";
import { PostTransactionsController } from "../controllers/index.js";
import { createPostTransactionsSchema } from "../schemas/post-transactions.js";
import { Route, RouteConfig } from "./route.js";

export class PostTransactionsRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/postTransactions": {
				codec: Codecs.postTransactions,
				handler: controller.handle,
				id: Routes.PostTransactions,
				maxBytes: constants.MAX_PAYLOAD_SERVER,
				validation: createPostTransactionsSchema(this.app),
			},
		};
	}

	protected getController(): PostTransactionsController {
		return this.app.resolve(PostTransactionsController);
	}
}
