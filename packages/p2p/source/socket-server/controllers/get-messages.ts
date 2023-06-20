import Hapi from "@hapi/hapi";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

interface Request extends Hapi.Request {
	payload: {};
}

interface Response {
	prevotes: Buffer[];
	precommits: Buffer[];
}

@injectable()
export class GetMessagesController implements Contracts.P2P.Controller {
	public async handle(request: Request, h: Hapi.ResponseToolkit): Promise<Response> {
		return {
			precommits: [],
			prevotes: [],
		};
	}
}
