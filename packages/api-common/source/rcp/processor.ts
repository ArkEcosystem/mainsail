import Hapi from "@hapi/hapi";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class Processor implements Contracts.Api.RPC.Processor {
	process(request: Hapi.Request) {
		return {};
	}
}
