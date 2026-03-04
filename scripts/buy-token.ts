#!/usr/bin/env node
/**
 * Four.meme - Simple Buy Token
 * Buy tokens after creation
 * 
 * Usage:
 *   npx tsx buy-token.ts <tokenAddress> <bnbAmount>
 * 
 * Example:
 *   npx tsx buy-token.ts 0x1234... 1
 * 
 * Env: PRIVATE_KEY
 */

import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';

const FACTORY = '0x5c952063c7fc8610ffdb798152d69f0b9550762b' as const;
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as const;

// Minimal ABI for buy function
const ABI = parseAbi([
  'function buyToken(address token, uint256 minAmount) payable external',
]);

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ Set PRIVATE_KEY');
    process.exit(1);
  }

  const pk = privateKey.startsWith('0x') 
    ? (privateKey as `0x${string}`) 
    : (`0x${privateKey}` as `0x${string}`);
  const account = privateKeyToAccount(pk);

  const tokenAddress = process.argv[2] as `0x${string}`;
  const bnbAmount = parseFloat(process.argv[3] || '1');

  if (!tokenAddress || tokenAddress.length !== 42) {
    console.error('❌ Invalid token address');
    console.log('Usage: npx tsx buy-token.ts <tokenAddress> <bnbAmount>');
    console.log('Example: npx tsx buy-token.ts 0x1234... 1');
    process.exit(1);
  }

  console.log(`🔑 Wallet: ${account.address}`);
  console.log(`🎯 Token: ${tokenAddress}`);
  console.log(`💰 Amount: ${bnbAmount} BNB`);
  console.log('');

  const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';
  const client = createWalletClient({
    account,
    chain: bsc,
    transport: http(rpcUrl),
  });

  try {
    console.log('⏳ Buying tokens...');
    
    const valueWei = BigInt(Math.floor(bnbAmount * 1e18));
    const minTokens = 0n; // Accept any amount (can be adjusted)

    const hash = await client.writeContract({
      address: FACTORY,
      abi,
      functionName: 'buyToken',
      args: [tokenAddress, minTokens],
      value: valueWei,
      gas: 500000n,
    });

    console.log('✅ Buy transaction submitted!');
    console.log(`🔗 Tx Hash: ${hash}`);
    console.log(`🌐 View: https://bscscan.com/tx/${hash}`);
    console.log('');
    console.log(JSON.stringify({ 
      success: true,
      txHash: hash,
      explorer: `https://bscscan.com/tx/${hash}`
    }, null, 2));
    
  } catch (error: any) {
    console.error('❌ Buy failed!');
    console.error('');
    
    if (error.message?.includes('revert')) {
      console.error('💡 Possible reasons:');
      console.error('   - Token not yet tradeable (wait for creation tx to confirm)');
      console.error('   - Token already graduated (on PancakeSwap)');
      console.error('   - Insufficient liquidity');
    } else {
      console.error(`💡 Error: ${error.message}`);
    }
    
    console.error('');
    console.error('💡 Alternative: Buy directly on https://four.meme');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌ Error:', e.message || e);
  process.exit(1);
});
