{const solanaWeb3 = require('@solana/web3.js');
const {Connection, programs } = require("@metaplex/js");
const axios = require('axios');
const config = require("./config.json")

if (!config.PROJECT_ADDRESS || !config.DISCORD_URL) {
    console.log("please set your environment variables!");
    return;
}

const cheerio = require('cheerio');

const projectPubKey = new solanaWeb3.PublicKey(config.PROJECT_ADDRESS);
const url = solanaWeb3.clusterApiUrl('mainnet-beta');
const solanaConnection = new solanaWeb3.Connection(url, 'confirmed');
const metaplexConnection = new Connection('mainnet-beta');
const { metadata: { Metadata } } = programs;
const pollingInterval = 2000; // ms
const marketplaceMap = {
    "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K": "Magic Eden",
    "HZaWndaNWHFDd9Dhk5pqUUtsmoBCqzb1MLu3NAh1VX6B": "Alpha Art",
    "617jbWo616ggkDxvW1Le8pV38XLbVSyWY8ae6QUmGBAU": "Solsea",
    "CJsLwbP1iu5DuUikHEJnLfANgKy6stB2uFgvBBHoyxwz": "Solanart",
    "A7p8451ktDCHq5yYaHczeLMYsjRsAkzc3hCXcSrwYHU7": "Digital Eyes",
    "AmK5g2XcyptVLCFESBCJqoSfwV3znGoVYQnqEnaAZKWn": "Exchange Art",
};


const anchor = require("@project-serum/anchor");

const anchorConnection = new anchor.web3.Connection(
  "https://api.mainnet-beta.solana.com"
);

const runSalesBot = async () => {
    console.log("starting sales bot...");

    let signatures;
    let lastKnownSignature;
      const mostRecentSignature = await solanaConnection.getSignaturesForAddress(projectPubKey, { limit: 1 });
    const options = { until: mostRecentSignature[0].signature };
    while (true) {
        try {
            signatures = await solanaConnection.getSignaturesForAddress(projectPubKey, options);
            if (!signatures.length) {
                console.log("polling...")
                await timer(pollingInterval);
                continue;
            }
        } catch (err) {
            console.log("error fetching signatures: ", err);
            continue;
        }


        for (let i = signatures.length - 1; i >= 0; i--) {
            try {
                let { signature } = signatures[i];
                const txn = await solanaConnection.getTransaction(signature);
                if (txn.meta && txn.meta.err != null) { continue; }

                const dateString = new Date(txn.blockTime * 1000).toLocaleString();
                const price = Math.abs((txn.meta.preBalances[0] - txn.meta.postBalances[0])) / solanaWeb3.LAMPORTS_PER_SOL;
                const accounts = txn.transaction.message.accountKeys;
                const marketplaceAccount = accounts[accounts.length - 1].toString();

                if (marketplaceMap[marketplaceAccount]) {
                    const metadata = await getMetadata(txn.meta.postTokenBalances[0].mint);
                    if (!metadata) {
                        console.log("couldn't get metadata");
                        continue;
                    }
                  
                  
                    printSalesInfo(dateString, price, signature, metadata.name, marketplaceMap[marketplaceAccount], metadata.image);
                    await postSaleToDiscord(metadata.name, price, dateString, signature, marketplaceMap[marketplaceAccount], metadata.image)
                } else {
                    console.log("not a supported marketplace sale");
                }
            } catch (err) {
                console.log("error while going through signatures: ", err);
                continue;
            }
        }

        lastKnownSignature = signatures[0].signature;
        if (lastKnownSignature) {
            options.until = lastKnownSignature;
        }
    }
}
runSalesBot();

const timer = ms => new Promise(res => setTimeout(res, ms))

const getMetadata = async (tokenPubKey) => {
    try {
        const addr = await Metadata.getPDA(tokenPubKey)
        const resp = await Metadata.load(metaplexConnection, addr);
        const { data } = await axios.get(resp.data.data.uri);

        return data;
    } catch (error) {
        console.log("error fetching metadata: ", error)
    }
}


const reverseHex = (hexString) => {
  hexString = hexString.slice(16, hexString.length - 2);
  var reversedHex = "";
  for (let i = hexString.length; i >= 0; i = i - 2) {
    const tmp = hexString.substring(i - 2, i);
    reversedHex += tmp;
  }

  return reversedHex;
};




const printSalesInfo = (date, price, signature, title, marketplace, imageURL) => {
    console.log("-------------------------------------------")
    console.log(`Sale at ${date} ---> ${price} SOL`)
    console.log("Signature: ", signature)
    console.log("Name: ", title)
    console.log("Image: ", imageURL)
    console.log("Marketplace: ", marketplace)
      console.log("-------------------------------------------")

}




const postSaleToDiscord = async (title, price, date, signature, marketplace, imageURL) => {
  
  
  
  axios.get('https://crypto.com/price/solana').then(({data}) => {
		$ = cheerio.load(data);
		var sol = $('span:contains("USD")').text().split(' ')[0].substring(1);
  const usd = (price * sol).toFixed(2);
   
   
  
const { Webhook, MessageBuilder } = require('discord-webhook-node');
    
const hook = new Webhook(config.DISCORD_URL);
const embed = new MessageBuilder()
.setTitle(`${title} ⇁ SOLD`)
.addField('Price', `${price.toFixed(2)} S◎L `)
.setThumbnail(`${imageURL}`)
.addField('Signature', `[${signature}](https://explorer.solana.com/tx/${signature}) ⧉`)
.setFooter(`Sold on ${marketplace}`)
.setTimestamp();

hook.send(embed);
     

    
}
                                                    )}
