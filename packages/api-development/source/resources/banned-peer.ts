import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import prettyMilliseconds from "pretty-ms";

@injectable()
export class BannedPeerResource implements Contracts.Api.Resource {
	public raw(resource: { ip: string; timeout: number }): object {
		return resource;
	}

	public transform(resource: { ip: string; timeout: number }): object {
		return {
			ip: resource.ip,
			timeout: prettyMilliseconds(Math.ceil(resource.timeout / 1000) * 1000),
		};
	}
}
