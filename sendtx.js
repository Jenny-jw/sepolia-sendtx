import dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

const main = async () => {
  const rpcURL = process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcURL || !privateKey) {
    console.error("Please set RPC_URL and PRIVATE_KEY in .env");
    return;
  }

  const provider = new ethers.JsonRpcProvider(rpcURL);
  const wallet = new ethers.Wallet(privateKey, provider);

  const address = await wallet.getAddress();
  console.log("Using address: ", address);

  const balance = await provider.getBalance(address);
  console.log("Balance (wei)", balance.toString());
  console.log("Balance (ETH)", ethers.formatEther(balance));

  const recipient = "0xB7a2c53A544a7b5253498E3A5CCf5888df57C147";
  const vauleInEther = "0.001";
  const value = ethers.parseEther(vauleInEther);

  const nonce = await provider.getTransactionCount(address);
  console.log("nonce: ", nonce);

  const feeData = await provider.getFeeData();
  console.log("feeData: ", {
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
    maxFeePerGas: feeData.maxFeePerGas?.toString(),
    gasPrice: feeData.gasPrice?.toString(),
  });

  const tx = {
    to: recipient,
    value: value,
    nonce: nonce,
    maxPriorityFeePerGas:
      feeData.maxPriorityFeePerGas ?? ethers.parseUnits("1", "gwei"),
    maxFeePerGas: feeData.maxFeePerGas ?? ethers.parseUnits("30", "gwei"),
  };

  try {
    const estimated = await provider.estimateGas({
      to: tx.to,
      from: address,
      value: tx.value,
    });
    tx.gasLimit = (BigInt(estimated) * 120n) / 100n; // add 20% buffer
    console.log(
      "estimated gasLimit:",
      estimated.toString(),
      "using",
      tx.gasLimit.toString(),
    );
  } catch (error) {
    console.warn(
      "Gas estimation failed, continuing without gasLimit. Error:",
      error.message,
    );
  }

  console.log("Sending transaction...");
  const sent = await wallet.sendTransaction(tx);
  console.log("Transaction hash:", sent.hash);
  console.log("Sent: ", sent);

  const receipt = await sent.wait(1);
  console.log("Transaction mined:");
  console.log({
    status: receipt.status,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed?.toString(),
    cumulativeGasUsed: receipt.cumulativeGasUsed?.toString(),
    effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
  });
  console.log("Receipt: ", receipt);

  const block = await provider.getBlock(receipt.blockNumber);
  const baseFeePerGas = BigInt(block.baseFeePerGas); // BigInt or ethers.BigInt-like
  //   const effectiveGasPrice = BigInt(receipt.effectiveGasPrice);
  //   const actualPriorityFee = effectiveGasPrice - baseFeePerGas;
  console.log("block: ", block);
  console.log("baseFeePerGas: ", baseFeePerGas);
  //   console.log("effectiveGasPrice: ", effectiveGasPrice);
  //   console.log("actualPriorityFee: ", actualPriorityFee);
};

main().catch((err) => {
  console.error("Error in main execution:", err);
  process.exit(1);
});
