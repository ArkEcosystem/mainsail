import { Peer } from "./peer.js";

export interface Downloader {
	download(peer: Peer): void;
	tryToDownload(): void;
	isDownloading(): boolean;
}
