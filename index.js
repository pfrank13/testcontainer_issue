const {GenericContainer, Wait} = require("testcontainers");
const fetch = require("node-fetch");
const sdk = require("@dsnp/sdk");
const { Wallet, providers } = require("ethers");

const handle = "flarp";
const publicKey = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const privateKey =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const activityPubOptions = {
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "Note",
    content: "Hello World",
    attributedTo: publicKey,
};

async function main() {
    const chain = await new GenericContainer("dsnp/ganache:latest")
        .withExposedPorts(8545)
        .withWaitStrategy(Wait.forHealthCheck())
        .start();

    const url = `http://${chain.getHost()}:${chain.getMappedPort(8545)}`;

    const data = {
        id: 1,
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: []
    };

    try {
        const response = await fetch(url, {
            method: 'post',
            body: JSON.stringify(data),
            headers: {"Content-Type": "application/json"}
        });

        const json = await response.json();
        console.log(json);

        await sdk.setConfig({
            signer: new Wallet(privateKey),
            provider: new providers.JsonRpcProvider(url),
            store: {
                put: (targetPath, content) => { return Promise.resolve("http://www.example.com");},
                get: (targetPath) => { return "/this/is/some/path"}
            },
        });

        const isAvailable = await sdk.isAvailable(handle);
        let id;
        if (isAvailable) {
            id = await sdk.createRegistration(publicKey, handle);
        } else {
            const registration = await sdk.resolveHandle(handle);
            id = registration?.dsnpUserId ?? "";
        }
        sdk.setConfig({
            ...sdk.getConfig(),
            currentFromId: id,
        });
        activityPubOptions.id = `${id}`;
        /* Doesn't exist in the 0.1.0 version of the SDK
        const batchfile = await sdk.broadcast(activityPubOptions);
        const announcements = [
            {
                dsnpType: batchfile.dsnpType,
                hash: "0x" + batchfile.contentHash,
                uri: batchfile.uri,
            },
        ];
        await sdk.core.contracts.announcement.batch(announcements);
         */
    } catch (e) {
        console.error(e);
        throw e;
    }

    await chain.stop();
}

main();


