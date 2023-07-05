import { IHeaderData, Peer } from "./peer";

export interface IHeader {
	toData(): IHeaderData;
	// hasHigherHeight(headerData: IHeaderData): boolean;
	// hasMissingProposal(headerData: IHeaderData): boolean;
	// hasMissingMessages(headerData: IHeaderData): boolean;
}

export interface IHeaderService {
	getHeader(): IHeader;
	handle(peer: Peer, header: IHeaderData): Promise<void>;
}
