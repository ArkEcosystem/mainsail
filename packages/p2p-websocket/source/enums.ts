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

export enum ListenerState {
	Stopped = "stopped",
	Listening = "listening",
	Stopping = "stopping",
}

export enum CloseReason {
	LocalClose = "localClose",
	RemoteClose = "remoteClose",
	HandshakeTimeout = "handshakeTimeout",
	VersionMismatch = "versionMismatch",
	ProtocolError = "protocolError",
	SocketError = "socketError",
	Rejected = "rejected",
	Banned = "banned",
	DuplicatePeer = "duplicatePeer",
	Shutdown = "shutdown",
}
