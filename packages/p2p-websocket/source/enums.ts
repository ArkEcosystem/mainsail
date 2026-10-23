export enum Direction {
	Inbound = "inbound",
	Outbound = "outbound",
}

export enum ConnectionState {
	Handshaking = "handshaking",
	Open = "open",
	Closing = "closing",
	Closed = "closed",
}

export enum CloseReason {
	LocalClose = "localClose",
	RemoteClose = "remoteClose",
	HandshakeTimeout = "handshakeTimeout",
	VersionMismatch = "versionMismatch",
	ProtocolError = "protocolError",
	SocketError = "socketError",
	Rejected = "rejected",
	Shutdown = "shutdown",
}
