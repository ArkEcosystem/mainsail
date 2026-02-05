import crypto from "/mainsail/tests/e2e/consensus/nodes/node0/core/crypto.json" with { type: "json" }
import validatorSecrets1 from "/mainsail/tests/e2e/consensus/nodes/node0/core/validators.json" with { type: "json" }
import validatorSecrets2 from "/mainsail/tests/e2e/consensus/nodes/node1/core/validators.json" with { type: "json" }
import validatorSecrets3 from "/mainsail/tests/e2e/consensus/nodes/node2/core/validators.json" with { type: "json" }
import validatorSecrets4 from "/mainsail/tests/e2e/consensus/nodes/node3/core/validators.json" with { type: "json" }
import validatorSecrets5 from "/mainsail/tests/e2e/consensus/nodes/node4/core/validators.json" with { type: "json" }

export const config = {
    to: "0x1000000000000000000000000000000000000000",
    tokenBeneficiary: "0x9000000000000000000000000000000000000009",
    senderPassphrase: validatorSecrets1.secrets[0],
    peer: {
        apiEvmUrl: "http://api-node:4008",
        apiTxPoolUrl: "http://api-node:4007",        
        apiHttpUrl: "http://api-http:4003"
    },
    validatorSecrets: [
        validatorSecrets1.secrets[0],
        validatorSecrets2.secrets[0],
        validatorSecrets3.secrets[0],
        validatorSecrets4.secrets[0],
        validatorSecrets5.secrets[0],
    ],
    crypto,
}