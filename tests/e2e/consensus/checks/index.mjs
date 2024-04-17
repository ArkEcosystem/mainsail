import got from "got";
import express from "express";

const app = express();
app.use(express.json());

// Listen for blocks until reaching TARGET_HEIGHT
const TARGET_HEIGHT = 30; // ~ 4 minutes
const EXPECTED_NUMBER_OF_PEERS = 3;

let webhookTarget;
let peers = [];

const peerBlockHeightMap = new Map();

(async () => {
    await discoverPeers();
    await setupWebhook();

    app.listen(3001, function () {
        console.log("Block listener port 3001!");
    });
})();

async function discoverPeers() {
    do {
        const resp = await got("http://peerdiscovery:3000", {
            headers: {
                "x-mainsail-e2e-no-peer": "1"
            }
        });
    
        // 'myIp' is the target url for the webhook
        const myIp = resp.headers["x-mainsail-e2e-my-ip"].
            replace("::ffff:", "");
    
        webhookTarget = `http://${myIp}:3001/callback`
        console.log("resp body", resp.statusCode, resp.body);
        peers = JSON.parse(resp.body) ?? [];
    
        console.log({ webhookTarget, peers });

        await sleep(1000);
    } while (peers.length < EXPECTED_NUMBER_OF_PEERS)

    for (const peer of peers) {
        peerBlockHeightMap.set(peer.ip, 0);
    }
}

async function setupWebhook() {
    app.post("/callback", function (req, res) {
        res.status(200).end();

        const { block: { header: { height }} } = req.body.data;
    
        if (!peerBlockHeightMap.has(req.ip)) {
            console.log("ignoring peer callback", req.ip);
            return;
        }

        console.log(`got block ${height} from ${req.ip}`);
        peerBlockHeightMap.set(req.ip, height);

        if (height >= TARGET_HEIGHT && peerBlockHeightMap.has(req.ip)) {
            console.log(`received target ${TARGET_HEIGHT} from ${req.ip}`);
            peerBlockHeightMap.delete(req.ip);

            if (peerBlockHeightMap.size === 0) {
                console.log(`successfully reached target height on all peers, exiting.`);
                process.exit(0);
            }
        }
    });

    // register webhook on all peers
    for (const peer of peers) {
        for (;;) {
            peer.ip = peer.ip.replace("::ffff:", "");
            const peerWebhookEndpoint = `http://${peer.ip}:4004/api/webhooks`;

            const resp = await got.post(peerWebhookEndpoint, {
                json: {
                    conditions: [],
                    event: "block.applied",
                    enabled: true,
                    target: webhookTarget
                }
            });

            await sleep(1000);

            if (resp.statusCode === 201) {
                console.log(`registered webhook at ${peerWebhookEndpoint}`);
                break;
            }
        }
    }
}

const sleep = async (ms) => await new Promise((resolve) => setTimeout(resolve, ms));