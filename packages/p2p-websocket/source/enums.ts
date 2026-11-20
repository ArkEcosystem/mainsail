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
	HeartbeatTimeout = "heartbeatTimeout",
	VersionMismatch = "versionMismatch",
	ProtocolError = "protocolError",
	PayloadTooLarge = "payloadTooLarge",
	SocketError = "socketError",
	RequestTimeout = "requestTimeout",
	RequestQueueFull = "requestQueueFull",
	NotOpen = "notOpen",
	Rejected = "rejected",
	Banned = "banned",
	DuplicatePeer = "duplicatePeer",
	Full = "full",
	Shutdown = "shutdown",
}
