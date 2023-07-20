import { Peer } from "./peer";

export interface BlockDownloader {
	downloadBlocks(peer: Peer): void;
}
