export enum ServerType {
	Http = "HTTP",
	Https = "HTTPS",
}

export enum Protocol {
	Http = 0,
	Https = 1,
}

export enum RcpErrorCode {
	RpcServerError = -32_000,
	ParseError = -32_700,
	InvalidRequest = -32_600,
	MethodNotFound = -32_601,
	InvalidParameters = -32_602,
	InternalError = -32_603,
}
