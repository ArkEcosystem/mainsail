declare const PeerProtocolValues: {
	readonly Http: 0;
	readonly Https: 1;
};
export type PeerProtocol = (typeof PeerProtocolValues)[keyof typeof PeerProtocolValues];
