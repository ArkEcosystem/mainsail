import { Routes } from "../../enums";
import { Codecs } from "../codecs";
import { GetMessagesController } from "../controllers";
import { Schemas } from "../schemas";
import { Route, RouteConfig } from "./route";

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
