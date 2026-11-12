import type { Peer } from "./peer.js";

export interface Downloader {
	download(peer: Peer): void;
	isDownloading(): boolean;
}
