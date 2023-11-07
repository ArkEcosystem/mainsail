import { Contracts } from "@mainsail/api-common";
import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";

@injectable()
export class PeerResource implements Contracts.Resource {
    public raw(resource: Models.Peer): object {
        return resource;
    }

    public transform(resource: Models.Peer): object {
        return {
            height: resource.height,
            ip: resource.ip,
            latency: resource.latency,
            plugins: resource.plugins,
            port: resource.port,
            ports: resource.ports,
            version: resource.version,
        }
    }
}
