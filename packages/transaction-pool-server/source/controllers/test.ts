import Hapi from "@hapi/hapi";
import { AbstractController } from "@mainsail/api-common";
import { injectable } from "@mainsail/container";

@injectable()
export class TestController extends AbstractController {
	public async store(request: Hapi.Request) {
		return "Hello World!";
	}
}
