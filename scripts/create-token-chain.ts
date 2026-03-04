#!/usr/bin/env node
/**
 * Four.meme - Step 2: Create token on BSC (Factory.createToken).
 * Uses createArg and signature from create-token-api.ts output.
 * 
 * NOTE: This ONLY creates the token. To buy, use execute-buy.ts afterwards.
 *
 * Usage:
 *   npx tsx create-token-chain.ts <createArgHex> <signatureHex>
 *
 * Env: PRIVATE_KEY
 * Optional: BSC_RPC_URL
 */

import { createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';

// FOUR.MEME Factory address
const FACTORY_BSC = '0x5c952063c7fc8610ffdb798152d69f0b9550762b' as const;

// CORRECT ABI - use createToken (NOT createAndBuyToken)
const ABI = parseAbi([
  'function createToken(bytes args, bytes signature) payable',
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

  const arg1 = process.argv[2];
  const arg2 = process.argv[3];
  
  if (!arg1 || !arg2 || arg1 === '--help') {
    console.log('Usage: npx tsx create-token-chain.ts <createArgHex> <signatureHex>');
    console.log('');
    console.log('⚠️  This ONLY creates the token (no buy).');
    console.log('   To buy tokens, use execute-buy.ts afterwards.');
    console.log('');
    console.log('Example:');
    console.log('  npx tsx create-token-chain.ts 0x7b226e616d6522... 0x8f3d7c9a...');
    console.log('');
    console.log('Then buy:');
    console.log('  npx tsx scripts/execute-buy.ts 0xTokenAddress 1');
    process.exit(1);
  }

  const createArgHex = toHex(arg1);
  const signatureHex = toHex(arg2);

  console.log(`🔑 Wallet: ${account.address}`);
  console.log(`📄 createArg: ${createArgHex.slice(0, 50)}...`);
  console.log(`✍️  signature: ${signatureHex.slice(0, 50)}...`);
  console.log('');
  console.log('⚠️  Note: This will only CREATE the token (no buy).');
  console.log('   You need to buy separately after creation.');
  console.log('');

  const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';
  const client = createWalletClient({
    account,
    chain: bsc,
    transport: http(rpcUrl),
  });

  try {
    console.log('⏳ Creating token...');
    
    const hash = await client.writeContract({
      address: FACTORY_BSC,
      abi: ABI,
      functionName: 'createToken',  // Only creates, no buy
      args: [createArgHex, signatureHex],
      value: 0n,  // No value needed for creation only
      gas: 2000000n,
    });

    console.log('✅ Token created!');
    console.log(`🔗 Tx Hash: ${hash}`);
    console.log(`🌐 View: https://bscscan.com/tx/${hash}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Token created but NOT bought!');
    console.log('   To buy tokens, check the token address from the receipt');
    console.log('   and use execute-buy.ts');
    console.log('');
    console.log(JSON.stringify({ 
      success: true,
      txHash: hash,
      explorer: `https://bscscan.com/tx/${hash}`,
      note: 'Token created but not bought. Use execute-buy.ts to buy.'
    }, null, 2));
    
  } catch (error: any) {
    console.error('❌ Transaction failed!');
    console.error('');
    console.error(`💡 Error: ${error.message}`);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌ Fatal error:', e.message || e);
  process.exit(1);
});
