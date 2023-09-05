import Hapi from "@hapi/hapi";

export interface Controller {
	handle(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<any>;
}
