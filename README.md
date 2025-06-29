# Self-deplyobable Simple Multisig Escrow
Simple escrow dapp with multisig disputes resolution


## Live on Polygon chain

Contract address:
https://polygonscan.com/address/0xDF078a36C7ED2361Aa83846B6F9A3F76c98EE689

The web app deployed to github pages:
https://adellantado.github.io/simple-multisig-escrow/

IPFS deployment:
QmPPWAzQGcxrL5TRFfrtuU27S429KCmryRKdvHDozMJfDK

> [!Note]
> To visit IPFS page please spin the local ipfs daemon first.
> For this you can execute: npm run open
>
> Make sure .env file contains correct IPFS_PAGE variable.


## Deploy your own web app or contract
- Deploy the factory contract to EVM compatible chain (or use existing polygon contract)
- Create .env file with the factory address
- Deploy the web app to your server or to ipfs

## How to use the dapp

1. Create a new escrow with Metamask connected and lock your funds on the chain.

![Create escrow](./assets/create_escrow.png)

2. Share the dapp link and the newly created escrow address with a beneficiary (contractor).

3. Let the beneficiary approve the escrow.

![Approve escrow](./assets/approve_escrow.png)

4. Release the funds or resolve the dispute with agreed multisig.

![Release funds](./assets/release_escrow.png)
