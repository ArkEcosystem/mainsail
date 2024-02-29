import Hapi from "@hapi/hapi";
import { injectable } from "@mainsail/container";

@injectable()
export class Processor {
	process(request: Hapi.Request) {
		return {};
	}
}
