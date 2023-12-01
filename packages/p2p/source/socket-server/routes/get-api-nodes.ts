import { Routes } from "../../enums";
import { Codecs } from "../codecs";
import { GetApiNodesController } from "../controllers";
import { Schemas } from "../schemas";
import { Route, RouteConfig } from "./route";

export class GetApiNodesRoute extends Route {
    public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
        const controller = this.getController();
        return {
            "/getApiNodes": {
                codec: Codecs.getApiNodes,
                handler: controller.handle,
                id: Routes.GetApiNodes,
                maxBytes: 1024,
                validation: Schemas.getApiNodes(this.cryptoConfiguration),
            },
        };
    }

    protected getController(): GetApiNodesController {
        return this.app.resolve(GetApiNodesController);
    }
}
