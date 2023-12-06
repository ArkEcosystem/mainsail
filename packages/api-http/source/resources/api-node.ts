import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class ApiNodeResource implements Contracts.Api.Resource {
    public raw(resource: Models.Peer): object {
        return resource;
    }

    public transform(resource: Models.Peer): object {
        return resource;
    }
}
