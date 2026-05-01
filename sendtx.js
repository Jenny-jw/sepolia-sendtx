import dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

const safeMsg = (err) => {
  try {
    if (!err) return "Unknown error";
    if (typeof err === "string") return err;
    if (err instanceof Error) return err.message;
    return err.message ?? err.reason ?? JSON.stringify(err);
  } catch (e) {
    return String(err);
  }
};

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

  const balance = await provider.getBalance(address); // BigNumber, in wei
  console.log("Balance (wei)", balance.toString());
  console.log("Balance (ETH)", ethers.formatEther(balance)); // Converts Wei to ETH

  const recipient = "0xB7a2c53A544a7b5253498E3A5CCf5888df57C147";
  const valueInEther = "0.001";
  const value = ethers.parseEther(valueInEther);

  const nonce = await provider.getTransactionCount(address); // Returns a Promise that resovles to the number of transactions this account has ever sent (also called the nonce) at the blockTag
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
      safeMsg(error),
    );
  }

  console.log("Sending transaction...");
  const sent = await wallet.sendTransaction(tx);
  console.log("Transaction hash:", sent.hash);
  console.log("Sent: ", sent);

  const receipt = await sent.wait(1); // wait for 1 confirmation
  console.log("Transaction mined:");
  console.log({
    status: receipt.status,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed?.toString(),
    cumulativeGasUsed: receipt.cumulativeGasUsed?.toString(),
    effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
  });
  console.log("Receipt: ", receipt);

  const explicitReceipt = await provider.getTransactionReceipt(sent.hash);
  console.log(
    "Explicit getTransactionReceipt:",
    explicitReceipt
      ? {
          status: explicitReceipt.status,
          blockNumber: explicitReceipt.blockNumber,
        }
      : null,
  );

  if (receipt.blockNumber != null) {
    const block = await provider.getBlock(receipt.blockNumber);
    const baseFeePerGas = block?.baseFeePerGas
      ? BigInt(block.baseFeePerGas.toString())
      : null;
    console.log(
      "block baseFeePerGas:",
      baseFeePerGas?.toString() ?? "N/A (pre-EIP1559 or unavailable)",
    );
    // compute actual priority fee if available
    if (receipt.effectiveGasPrice != null && baseFeePerGas != null) {
      const eff = BigInt(receipt.effectiveGasPrice.toString());
      const actualPriorityFee = eff - baseFeePerGas;
      console.log("actualPriorityFee (wei):", actualPriorityFee.toString());
    }
  }
};

main().catch((err) => {
  console.error("Error in main execution:", err);
  process.exit(1);
});
