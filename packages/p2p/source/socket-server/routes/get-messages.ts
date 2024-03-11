import { Routes } from "../../enums.js";
import { Codecs } from "../codecs/index.js";
import { GetMessagesController } from "../controllers/index.js";
import { Schemas } from "../schemas/index.js";
import { Route, RouteConfig } from "./route.js";

export class GetMessagesRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/getMessages": {
				codec: Codecs.getMessages,
				handler: controller.handle,
				id: Routes.GetMessages,
				maxBytes: 1024,
				validation: Schemas.getMessages(this.cryptoConfiguration),
			},
		};
	}

	protected getController(): GetMessagesController {
		return this.app.resolve(GetMessagesController);
	}
}
