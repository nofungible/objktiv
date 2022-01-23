# OBJKTIV: Tezos NFT Viewer
⚠️ Heads Up! You are viewing an early release version. This dApp is not fully bug tested! ⚠️

https://mikesizz.github.io/objktiv-alpha/

## About
### Functionality
This dApp allows you to view Tezos based NFTs minted on the hic et nunc and fxhash smart contracts. Additional smart contract support will be coming soon.

The alpha version includes wallet sync'ing, anonymous wallet viewing, gallery creation, popout objkt viewer w/ bg color selector, and day/night mode.

All settings are persisted via local storage, so settings will not carry over between devices. Settings export will come shortly.

### Decentralization
The goal is to stand OBJKTIV up as a fully decentralized application, though centralized indexers are used as a dependency in its current incarnation. With this in mind, most views, galleries, objkts, etc can be shared via URL. Ideally, everything that dictates your viewing experience will be encoded in the URL making it is 100% shareable.

## FAQ
### Why do some images/videos/resources not load or load slow?
This application makes ZERO attempts at hiding the true nature/state of IPFS and its role in non-fungible tokens functionality. That being said, no CDNs will ever be used, and no special loading, parsing, or manipluation takes place while loading IPFS resources.

If you are seeing missing images or slow load times this means your IPFS resource needs more pinning support or that the gateway you are using is under stress or suffering outages.

It is always recommended that if you appreciate an NFT, whether you own it or not, you should should pin it using a local IPFS node or at least a free tier plan with an IPFS node provider.

It's up to all of us to support the distributed hosting network that keeps our art alive for all to enjoy!

#### "What is an IPFS pinning service?"
I am not affiliated with pinata in any way. There are many IPFS pinning services. Educate yourself about their pricing and offerings.

https://medium.com/pinata/what-is-an-ipfs-pinning-service-f6ed4cd7e475

#### IPFS Desktop
Run IPFS yourself. CLI options are also available.

https://docs.ipfs.io/install/ipfs-desktop/

#### IPFS Persistence
More technical breakdown.

https://docs.ipfs.io/concepts/persistence/

### Is this application safe?
The only interaction with your wallet that takes place is an address request. No transactions, contract origination, minting, selling, trading, etc occurs in any way.

Your security is always in your hands alone. Do not trust anything on the internet!

### How can I report bugs/issues?
Please report any OBJKTIV related issues using the Google form below.

https://forms.gle/N6KVb1GbjdGn8u4f8

### How can I request features?
Please provide any OBJKTIV feature requests using the Google form below.

https://forms.gle/FDZHQAe9K7sXpqxh8

### How can I contribute?
A proper open source repository will quickly follow the publication of this alpha version.

The code in its current state is not worthy of contribution and will need a refactor before pull requests are accepted.

--
Bye! 🤗