export enum NetworkStateStatus {
	Default,
	BelowMinimumPeers,
	Test,
	Unknown,
}

export enum SocketErrors {
	Timeout = "CoreTimeoutError",
	SocketNotOpen = "CoreSocketNotOpenError",
	Validation = "CoreValidationError",
}

export enum Routes {
	GetApiNodes = "getApiNodes",
	GetBlocks = "getBlocks",
	GetMessages = "getMessages",
	GetProposal = "getProposal",
	GetPeers = "getPeers",
	GetStatus = "getStatus",
	PostPrevote = "postPrevote",
	PostProposal = "postProposal",
}
