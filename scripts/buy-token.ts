#!/usr/bin/env node
/**
 * Four.meme - Buy Token (FIXED VERSION)
 * Correctly buys tokens through TokenManager
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

const HELPER_ADDRESS = '0xF251F83e40a78868FcfA3FA4599Dad6494E46034' as const;
const ZERO = '0x0000000000000000000000000000000000000000' as const;

// Helper ABI for getting token info
const HELPER_ABI = parseAbi([
  'function getTokenInfo(address token) view returns (uint256 version, address tokenManager, address quote, uint256 lastPrice, uint256 tradingFeeRate, uint256 minTradingFee, uint256 launchTime, uint256 offers, uint256 maxOffers, uint256 funds, uint256 maxFunds, bool liquidityAdded)',
  'function tryBuy(address token, uint256 amount, uint256 funds) view returns (address tokenManager, address quote, uint256 estimatedAmount, uint256 estimatedCost, uint256 estimatedFee, uint256 amountMsgValue, uint256 amountApproval, uint256 amountFunds)',
]);

// TokenManager ABI
const TOKEN_MANAGER_ABI = parseAbi([
  'function buyToken(address token, uint256 amount, uint256 maxFunds) payable external',
  'function buyTokenAMAP(address token, uint256 funds, uint256 minAmount) payable external',
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

  console.log('🚀 Starting Buy Process');
  console.log('=======================');
  console.log(`Wallet: ${account.address}`);
  console.log(`Token: ${tokenAddress}`);
  console.log(`Amount: ${bnbAmount} BNB`);
  console.log('');

  const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';
  
  const publicClient = createPublicClient({
    chain: bsc,
    transport: http(rpcUrl),
  });
  
  const walletClient = createWalletClient({
    account,
    chain: bsc,
    transport: http(rpcUrl),
  });

  try {
    // STEP 1: Get token info (including tokenManager address)
    console.log('Step 1/3: Getting token info...');
    const tokenInfo = await publicClient.readContract({
      address: HELPER_ADDRESS,
      abi: HELPER_ABI,
      functionName: 'getTokenInfo',
      args: [tokenAddress],
    });
    
    const version = tokenInfo[0];
    const tokenManager = tokenInfo[1];
    const quote = tokenInfo[2];
    
    console.log(`✅ Token info obtained`);
    console.log(`   Version: ${version}`);
    console.log(`   TokenManager: ${tokenManager}`);
    console.log(`   Quote Token: ${quote}`);
    console.log('');

    if (Number(version) !== 2) {
      console.warn(`⚠️ Warning: Token version is ${version}, expected 2`);
    }

    // STEP 2: Try buy (get estimation)
    console.log('Step 2/3: Estimating buy...');
    const fundsWei = BigInt(Math.floor(bnbAmount * 1e18));
    
    const tryBuyResult = await publicClient.readContract({
      address: HELPER_ADDRESS,
      abi: HELPER_ABI,
      functionName: 'tryBuy',
      args: [tokenAddress, 0n, fundsWei], // amount=0 means buy with fixed funds
    });
    
    const estimatedAmount = tryBuyResult[2];
    const estimatedCost = tryBuyResult[3];
    const estimatedFee = tryBuyResult[4];
    const amountMsgValue = tryBuyResult[5];
    
    console.log(`✅ Buy estimation:`);
    console.log(`   Estimated tokens: ${estimatedAmount.toString()}`);
    console.log(`   Cost: ${estimatedCost.toString()}`);
    console.log(`   Fee: ${estimatedFee.toString()}`);
    console.log(`   MsgValue: ${amountMsgValue.toString()}`);
    console.log('');

    // STEP 3: Execute buy
    console.log('Step 3/3: Executing buy...');
    console.log('⏳ Submitting transaction...');
    
    // Use buyTokenAMAP for buying with fixed funds
    const hash = await walletClient.writeContract({
      address: tokenManager,
      abi: TOKEN_MANAGER_ABI,
      functionName: 'buyTokenAMAP',
      args: [tokenAddress, fundsWei, 0n], // minAmount=0, accept any
      value: amountMsgValue,
      gas: 500000n,
    });

    console.log('✅ Buy transaction submitted!');
    console.log(`🔗 Tx Hash: ${hash}`);
    console.log(`🌐 View: https://bscscan.com/tx/${hash}`);
    console.log('');
    
    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash,
      timeout: 120_000
    });
    
    if (receipt.status === 'success') {
      console.log('✅ BUY SUCCESSFUL!');
      console.log('');
      console.log(JSON.stringify({ 
        success: true,
        txHash: hash,
        tokenAddress: tokenAddress,
        explorer: `https://bscscan.com/tx/${hash}`
      }, null, 2));
    } else {
      console.error('❌ Transaction failed on chain');
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error('❌ Buy failed!');
    console.error('');
    
    if (error.message?.includes('insufficient funds')) {
      console.error('💡 Error: Insufficient BNB balance');
    } else if (error.message?.includes('revert')) {
      console.error('💡 Error: Contract reverted');
      console.error('   Possible causes:');
      console.error('   - Token not yet tradeable');
      console.error('   - Token already graduated (on PancakeSwap)');
      console.error('   - Slippage too high');
    } else {
      console.error(`💡 Error: ${error.message}`);
    }
    
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌ Error:', e.message || e);
  process.exit(1);
});
