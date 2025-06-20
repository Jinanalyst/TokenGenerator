const web3 = require("@solana/web3.js");
(async () => {
  const solana = new web3.Connection("https://attentive-neat-voice.solana-mainnet.quiknode.pro/766c55c0c8f4282262b427646ba1285368c0c752/");
  console.log(await solana.getSlot());
})(); 