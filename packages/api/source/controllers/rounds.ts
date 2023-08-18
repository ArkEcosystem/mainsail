import { notFound } from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { injectable } from "@mainsail/container";

import { Controller } from "./controller";

@injectable()
export class RoundsController extends Controller {
	public async delegates(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		return notFound("Round not found");
	}
}
