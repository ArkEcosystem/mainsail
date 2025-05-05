import crypto from "/mainsail/tests/e2e/consensus/nodes/node0/core/crypto.json" with { type: "json" }
import validatorSecrets from "/mainsail/tests/e2e/consensus/nodes/node0/core/validators.json" with { type: "json" }

export const config = {
    to: "0x1000000000000000000000000000000000000000",
    senderPassphrase: validatorSecrets.secrets[0],
    peer: {
        apiEvmUrl: "http://api-node:4008",
        apiTxPoolUrl: "http://api-node:4007",        
        apiHttpUrl: "http://api-http:4003"
    },
    crypto,
}