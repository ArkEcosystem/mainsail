import { Peer } from "./peer";

export interface Downloader {
	download(peer: Peer): void;
	isDownloading(): boolean;
}
