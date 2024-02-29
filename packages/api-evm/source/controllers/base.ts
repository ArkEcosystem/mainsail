import Hapi from "@hapi/hapi";
import { injectable } from "@mainsail/container";

@injectable()
export class BaseController {
	public async index(request: Hapi.Request) {
		return {};
	}
}
