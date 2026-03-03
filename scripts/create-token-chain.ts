#!/usr/bin/env node
/**
 * Four.meme - submit createToken tx on BSC (Factory.createAndBuyToken).
 * Uses createArg and signature from create-token-api.ts output.
 * 
 * FIXED VERSION - Uses correct function name and parameters
 *
 * Usage:
 *   npx tsx create-token-chain.ts <createArgHex> <signatureHex> [buyAmountInBNB]
 *
 * Env: PRIVATE_KEY
 * Optional: BSC_RPC_URL, BUY_AMOUNT (default: 1 BNB)
 */

import { createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';

// FOUR.MEME Factory address (verified)
const FACTORY_BSC = '0x5c952063c7fc8610ffdb798152d69f0b9550762b' as const;

// CORRECT ABI - use createAndBuyToken not createToken
const ABI = parseAbi([
  'function createAndBuyToken(bytes createArg, bytes signature) payable',
]);

function toHex(s: string): `0x${string}` {
  if (s.startsWith('0x')) return s as `0x${string}`;
  if (/^[0-9a-fA-F]+$/.test(s)) return ('0x' + s) as `0x${string}`;
  const buf = Buffer.from(s, 'base64');
  return ('0x' + buf.toString('hex')) as `0x${string}`;
}

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ Set PRIVATE_KEY environment variable');
    process.exit(1);
  }
  
  const pk = privateKey.startsWith('0x') 
    ? (privateKey as `0x${string}`) 
    : (`0x${privateKey}` as `0x${string}`);
  const account = privateKeyToAccount(pk);

  // Parse arguments
  const arg1 = process.argv[2];
  const arg2 = process.argv[3];
  const buyAmountArg = process.argv[4];
  
  if (!arg1 || !arg2 || arg1 === '--help') {
    console.log('Usage: npx tsx create-token-chain.ts <createArgHex> <signatureHex> [buyAmountInBNB]');
    console.log('');
    console.log('Example:');
    console.log('  npx tsx create-token-chain.ts 0x7b226e616d6522... 0x8f3d7c9a... 1');
    console.log('');
    console.log('Environment:');
    console.log('  PRIVATE_KEY    - Required. Wallet private key');
    console.log('  BSC_RPC_URL    - Optional. BSC RPC endpoint');
    console.log('  BUY_AMOUNT     - Optional. BNB amount to buy (default: 1)');
    process.exit(1);
  }

  const createArgHex = toHex(arg1);
  const signatureHex = toHex(arg2);
  
  // Buy amount (default 1 BNB)
  const buyAmount = buyAmountArg 
    ? parseFloat(buyAmountArg) 
    : parseFloat(process.env.BUY_AMOUNT || '1');
  const valueWei = BigInt(Math.floor(buyAmount * 1e18));

  console.log(`🔑 Wallet: ${account.address}`);
  console.log(`💰 Buy Amount: ${buyAmount} BNB`);
  console.log(`📄 createArg: ${createArgHex.slice(0, 50)}...`);
  console.log(`✍️  signature: ${signatureHex.slice(0, 50)}...`);
  console.log('');

  const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';
  const client = createWalletClient({
    account,
    chain: bsc,
    transport: http(rpcUrl),
  });

  try {
    console.log('⏳ Submitting transaction...');
    
    const hash = await client.writeContract({
      address: FACTORY_BSC,
      abi: ABI,
      functionName: 'createAndBuyToken',  // CORRECT function name
      args: [createArgHex, signatureHex],
      value: valueWei,
      gas: 2000000n,  // Set explicit gas limit
    });

    console.log('✅ Transaction submitted!');
    console.log(`🔗 Tx Hash: ${hash}`);
    console.log(`🌐 View: https://bscscan.com/tx/${hash}`);
    console.log('');
    console.log(JSON.stringify({ 
      success: true,
      txHash: hash,
      explorer: `https://bscscan.com/tx/${hash}`
    }, null, 2));
    
  } catch (error: any) {
    console.error('❌ Transaction failed!');
    console.error('');
    
    if (error.message?.includes('insufficient funds')) {
      console.error('💡 Error: Insufficient BNB balance');
      console.error(`   Need: ~${buyAmount + 0.02} BNB (buy + gas)`);
    } else if (error.message?.includes('revert')) {
      console.error('💡 Error: Contract reverted');
      console.error('   Possible causes:');
      console.error('   - Signature expired (get a new one)');
      console.error('   - Invalid createArg format');
      console.error('   - Token name already exists');
      console.error('   - Contract address changed');
    } else if (error.message?.includes('invalid BytesLike')) {
      console.error('💡 Error: Invalid argument format');
      console.error('   Make sure createArg and signature are valid hex strings');
    } else {
      console.error(`💡 Error: ${error.message}`);
    }
    
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌ Fatal error:', e.message || e);
  process.exit(1);
});
