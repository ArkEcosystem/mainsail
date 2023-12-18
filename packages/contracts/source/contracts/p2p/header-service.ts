import { HeaderData } from "./header";
import { Peer } from "./peer";

export interface HeaderService {
	handle(peer: Peer, header: HeaderData): Promise<void>;
}
