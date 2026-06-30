// ─── $FARBORN On-chain Module ─────────────────────────
// Handles ERC20 transfers from treasury to players
// Gold is in-game only, not on-chain

import { ethers } from 'ethers';

const BASE_RPC = 'https://mainnet.base.org';
const FARBORN_SC = '0x4abD609B323ce6E7C0770E86d21E76BA00209DE2';
const TREASURY = '0x3e7994F6C55FC3FEcf3698e573aa22f463E99F02';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

let provider, treasuryWallet, farbornToken;

export function initOnchain(privateKey) {
  provider = new ethers.JsonRpcProvider(BASE_RPC);
  treasuryWallet = new ethers.Wallet(privateKey, provider);
  farbornToken = new ethers.Contract(FARBORN_SC, ERC20_ABI, provider);
  console.log(`[onchain] Treasury: ${treasuryWallet.address}`);
}

// Transfer FARBORN from treasury to player wallet
export async function sendTokens(playerWallet, tokenAmount) {
  if (!treasuryWallet) throw new Error('Onchain not initialized');
  const tokenWei = ethers.parseUnits(tokenAmount.toString(), 18);
  const tx = await farbornToken.connect(treasuryWallet).transfer(playerWallet, tokenWei);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, tokensSent: tokenAmount };
}

// Verify a token transfer TO the treasury (for token→gold)
export async function verifyIncomingTransfer(txHash, expectedFrom) {
  if (!provider) throw new Error('Onchain not initialized');
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) return { valid: false, error: 'Transaction not found' };

  const iface = new ethers.Interface(ERC20_ABI);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === 'Transfer') {
        const from = parsed.args[0].toLowerCase();
        const to = parsed.args[1].toLowerCase();
        const amount = parsed.args[2];
        if (from === expectedFrom.toLowerCase() && to === TREASURY.toLowerCase()) {
          return { valid: true, amount: Number(ethers.formatUnits(amount, 18)) };
        }
      }
    } catch {}
  }
  return { valid: false, error: 'No valid FARBORN transfer to treasury found' };
}

export async function getTreasuryBalance() {
  if (!farbornToken) return { farborn: 0, eth: '0' };
  const [ethBal, tokenBal] = await Promise.all([
    provider.getBalance(TREASURY),
    farbornToken.balanceOf(TREASURY)
  ]);
  return {
    farborn: Number(ethers.formatUnits(tokenBal, 18)),
    eth: ethers.formatEther(ethBal),
    address: TREASURY
  };
}
