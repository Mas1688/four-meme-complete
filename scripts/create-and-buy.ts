#!/usr/bin/env node
/**
 * Four.meme - Create Token AND Buy in one step
 * Combines API flow + chain creation + automatic buying
 * 
 * Usage:
 *   npx tsx create-and-buy.ts <imagePath> <name> <shortName> <desc> <label> [buyAmountBNB]
 * 
 * Example:
 *   npx tsx create-and-buy.ts ./logo.png "My Token" "MTK" "Description" "AI" 1
 * 
 * Env: PRIVATE_KEY
 */

import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { bsc } from 'viem/chains';

const API_BASE = 'https://four.meme/meme-api/v1';
const NETWORK_CODE = 'BSC';
const FACTORY_BSC = '0x5c952063c7fc8610ffdb798152d69f0b9550762b' as const;
const HELPER_ADDRESS = '0xF251F83e40a78868FcfA3FA4599Dad6494E46034' as const;

// ABI for createToken
const FACTORY_ABI = parseAbi([
  'function createToken(bytes args, bytes signature) payable',
  'event TokenCreated(address indexed token, address indexed creator)',
]);

// Helper ABI for getting token info and tryBuy
const HELPER_ABI = parseAbi([
  'function getTokenInfo(address token) view returns (uint256 version, address tokenManager, address quote, uint256 lastPrice, uint256 tradingFeeRate, uint256 minTradingFee, uint256 launchTime, uint256 offers, uint256 maxOffers, uint256 funds, uint256 maxFunds, bool liquidityAdded)',
  'function tryBuy(address token, uint256 amount, uint256 funds) view returns (address tokenManager, address quote, uint256 estimatedAmount, uint256 estimatedCost, uint256 estimatedFee, uint256 amountMsgValue, uint256 amountApproval, uint256 amountFunds)',
]);

// TokenManager ABI for buying
const TOKEN_MANAGER_ABI = parseAbi([
  'function buyTokenAMAP(address token, uint256 funds, uint256 minAmount) payable external',
]);

function toHex(value: string): string {
  if (value.startsWith('0x')) return value;
  if (/^[0-9a-fA-F]+$/.test(value)) return '0x' + value;
  const buf = Buffer.from(value, 'base64');
  return '0x' + buf.toString('hex');
}

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ Set PRIVATE_KEY');
    process.exit(1);
  }
  
  const pk = privateKey.startsWith('0x') ? (privateKey as `0x${string}`) : (`0x${privateKey}` as `0x${string}`);
  const account = privateKeyToAccount(pk);
  const address = account.address;

  const imagePath = process.argv[2];
  const name = process.argv[3];
  const shortName = process.argv[4];
  const desc = process.argv[5];
  const label = process.argv[6];
  const buyAmountBNB = parseFloat(process.argv[7] || '1');

  if (!imagePath || !name || !shortName || !desc || !label) {
    console.error('Usage: npx tsx create-and-buy.ts <imagePath> <name> <shortName> <desc> <label> [buyAmountBNB]');
    console.error('Example: npx tsx create-and-buy.ts ./logo.png "My Token" "MTK" "Description" "AI" 1');
    process.exit(1);
  }

  if (!existsSync(imagePath)) {
    console.error('❌ Image file not found:', imagePath);
    process.exit(1);
  }

  const validLabels = ['Meme', 'AI', 'Defi', 'Games', 'Infra', 'De-Sci', 'Social', 'Depin', 'Charity', 'Others'];
  const labelNorm = validLabels.find((l) => l.toLowerCase() === label.toLowerCase());
  if (!labelNorm) {
    console.error('❌ Invalid label. Use one of:', validLabels.join(', '));
    process.exit(1);
  }

  console.log('🚀 Starting Create + Buy Process');
  console.log('================================');
  console.log(`Wallet: ${address}`);
  console.log(`Token Name: ${name} (${shortName})`);
  console.log(`Buy Amount: ${buyAmountBNB} BNB`);
  console.log('');

  // Setup clients
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

  // STEP 1: Get nonce
  console.log('Step 1/5: Getting nonce...');
  const nonceRes = await fetch(`${API_BASE}/private/user/nonce/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountAddress: address,
      verifyType: 'LOGIN',
      networkCode: NETWORK_CODE,
    }),
  });
  const nonceData = await nonceRes.json();
  if (nonceData.code !== '0' && nonceData.code !== 0) {
    throw new Error('Nonce failed: ' + JSON.stringify(nonceData));
  }
  const nonce = nonceData.data;
  console.log('✅ Nonce obtained');

  // STEP 2: Login
  console.log('Step 2/5: Logging in...');
  const message = `You are sign in Meme ${nonce}`;
  const signature = await account.signMessage({ message });

  const loginRes = await fetch(`${API_BASE}/private/user/login/dex`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      region: 'WEB',
      langType: 'EN',
      loginIp: '',
      inviteCode: '',
      verifyInfo: {
        address,
        networkCode: NETWORK_CODE,
        signature,
        verifyType: 'LOGIN',
      },
      walletName: 'MetaMask',
    }),
  });
  const loginData = await loginRes.json();
  if (loginData.code !== '0' && loginData.code !== 0) {
    throw new Error('Login failed: ' + JSON.stringify(loginData));
  }
  const accessToken = loginData.data;
  console.log('✅ Logged in');

  // STEP 3: Upload image
  console.log('Step 3/5: Uploading image...');
  const imageBuffer = readFileSync(imagePath);
  const form = new FormData();
  form.append('file', new Blob([imageBuffer]), basename(imagePath));

  const uploadRes = await fetch(`${API_BASE}/private/token/upload`, {
    method: 'POST',
    headers: { 'meme-web-access': accessToken },
    body: form as unknown as BodyInit,
  });
  const uploadData = await uploadRes.json();
  if (uploadData.code !== '0' && uploadData.code !== 0) {
    throw new Error('Upload failed: ' + JSON.stringify(uploadData));
  }
  const imgUrl = uploadData.data;
  console.log('✅ Image uploaded:', imgUrl.slice(0, 50) + '...');

  // STEP 4: Get public config and create
  console.log('Step 4/5: Getting config and creating...');
  const configRes = await fetch(`${API_BASE}/public/config`);
  const configData = await configRes.json();
  if (configData.code !== '0' && configData.code !== 0) {
    throw new Error('Config failed: ' + JSON.stringify(configData));
  }
  const symbols = configData.data;
  const published = symbols.filter((c: { status?: string }) => c.status === 'PUBLISH');
  const list = published.length > 0 ? published : symbols;
  const config = list.find((c: { symbol?: string }) => c.symbol === 'BNB') ?? list[0];
  const raisedToken = config;

  const launchTime = Date.now();
  const totalSupply = typeof (raisedToken as { totalAmount?: string | number }).totalAmount !== 'undefined'
    ? Number((raisedToken as { totalAmount?: string | number }).totalAmount)
    : 1000000000;
  const raisedAmount = typeof (raisedToken as { totalBAmount?: string | number }).totalBAmount !== 'undefined'
    ? Number((raisedToken as { totalBAmount?: string | number }).totalBAmount)
    : 24;

  const body: Record<string, unknown> = {
    name,
    shortName,
    desc,
    totalSupply,
    raisedAmount,
    saleRate: typeof (raisedToken as { saleRate?: string | number }).saleRate !== 'undefined'
      ? Number((raisedToken as { saleRate?: string | number }).saleRate)
      : 0.8,
    reserveRate: 0,
    imgUrl,
    raisedToken,
    launchTime,
    funGroup: false,
    label: labelNorm,
    lpTradingFee: 0.0025,
    webUrl: process.env.WEB_URL ?? '',
    twitterUrl: process.env.TWITTER_URL ?? '',
    telegramUrl: process.env.TELEGRAM_URL ?? '',
    preSale: process.env.PRE_SALE ?? '0',
    clickFun: false,
    symbol: (raisedToken as { symbol: string }).symbol,
    dexType: 'PANCAKE_SWAP',
    rushMode: false,
    onlyMPC: false,
    feePlan: process.env.FEE_PLAN === 'true',
  };

  const createRes = await fetch(`${API_BASE}/private/token/create`, {
    method: 'POST',
    headers: {
      'meme-web-access': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const createData = await createRes.json();
  if (createData.code !== '0' && createData.code !== 0) {
    throw new Error('Create API failed: ' + JSON.stringify(createData));
  }
  const { createArg: rawArg, signature: rawSig } = createData.data;
  const createArgHex = toHex(rawArg) as `0x${string}`;
  const signatureHex = toHex(rawSig) as `0x${string}`;
  console.log('✅ Signature obtained from server');

  // STEP 5: Create token on chain
  console.log('Step 5/5: Creating token on blockchain...');
  console.log('⏳ Submitting creation transaction...');
  
  const createHash = await walletClient.writeContract({
    address: FACTORY_BSC,
    abi: FACTORY_ABI,
    functionName: 'createToken',
    args: [createArgHex, signatureHex],
    value: 0n,
    gas: 2000000n,
  });

  console.log('✅ Token creation submitted!');
  console.log(`🔗 Creation Tx: ${createHash}`);
  console.log(`🌐 View: https://bscscan.com/tx/${createHash}`);
  console.log('');

  // Wait for confirmation and get token address
  console.log('⏳ Waiting for creation confirmation...');
  const receipt = await publicClient.waitForTransactionReceipt({ 
    hash: createHash,
    timeout: 120_000 // 2 minutes timeout
  });
  
  if (receipt.status !== 'success') {
    throw new Error('Token creation failed on chain');
  }
  console.log('✅ Token created successfully!');

  // Extract token address from logs
  const tokenCreatedLog = receipt.logs.find(log => 
    log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' || // Transfer event
    log.address.toLowerCase() === FACTORY_BSC.toLowerCase()
  );
  
  // Try to find token address from event
  let tokenAddress: `0x${string}` | null = null;
  
  // Check if we can find TokenCreated event
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === FACTORY_BSC.toLowerCase() && log.topics.length >= 2) {
      // TokenCreated event topic0: keccak256("TokenCreated(address,address)")
      const topic0 = log.topics[0];
      if (topic0) {
        // Try to extract token address from data
        try {
          const potentialAddress = `0x${log.topics[1]?.slice(-40)}` as `0x${string}`;
          if (potentialAddress && potentialAddress.length === 42) {
            tokenAddress = potentialAddress;
            break;
          }
        } catch {}
      }
    }
  }

  console.log('');
  console.log('🎉 TOKEN CREATED!');
  console.log('==================');
  console.log(`Token Address: ${tokenAddress || 'Check BSCScan for address'}`);
  console.log(`Creation Tx: ${createHash}`);
  console.log('');

  // AUTO BUY - Now buy tokens through TokenManager
  if (buyAmountBNB > 0 && tokenAddress) {
    console.log('💰 AUTO BUYING TOKENS...');
    console.log('========================');
    console.log(`Amount: ${buyAmountBNB} BNB`);
    console.log(`Token: ${tokenAddress}`);
    console.log('');
    
    try {
      // Wait a bit for the token to be fully registered
      console.log('⏳ Waiting 5 seconds for token registration...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Get token info (including tokenManager address)
      console.log('Getting token info...');
      const tokenInfo = await publicClient.readContract({
        address: HELPER_ADDRESS,
        abi: HELPER_ABI,
        functionName: 'getTokenInfo',
        args: [tokenAddress],
      });
      
      const tokenManager = tokenInfo[1];
      console.log(`✅ TokenManager: ${tokenManager}`);
      
      // Get buy estimation
      const fundsWei = BigInt(Math.floor(buyAmountBNB * 1e18));
      const tryBuyResult = await publicClient.readContract({
        address: HELPER_ADDRESS,
        abi: HELPER_ABI,
        functionName: 'tryBuy',
        args: [tokenAddress, 0n, fundsWei],
      });
      
      const amountMsgValue = tryBuyResult[5];
      console.log(`✅ Buy estimation: ${tryBuyResult[2].toString()} tokens`);
      
      // Execute buy through TokenManager
      console.log('⏳ Submitting buy transaction...');
      const buyHash = await walletClient.writeContract({
        address: tokenManager,
        abi: TOKEN_MANAGER_ABI,
        functionName: 'buyTokenAMAP',
        args: [tokenAddress, fundsWei, 0n],
        value: amountMsgValue,
        gas: 500000n,
      });
      
      console.log('✅ Buy transaction submitted!');
      console.log(`🔗 Buy Tx: ${buyHash}`);
      console.log(`🌐 View: https://bscscan.com/tx/${buyHash}`);
      console.log('');
      
      // Wait for buy confirmation
      console.log('⏳ Waiting for buy confirmation...');
      const buyReceipt = await publicClient.waitForTransactionReceipt({ 
        hash: buyHash,
        timeout: 120_000
      });
      
      if (buyReceipt.status === 'success') {
        console.log('✅ BUY SUCCESSFUL!');
        console.log('');
        console.log('🎊 ALL DONE!');
        console.log('=============');
        console.log(`Token: ${tokenAddress}`);
        console.log(`Creation Tx: ${createHash}`);
        console.log(`Buy Tx: ${buyHash}`);
        console.log(`Explorer: https://bscscan.com/address/${tokenAddress}`);
      } else {
        console.log('⚠️ Buy transaction failed, but token was created');
        console.log(`Token: ${tokenAddress}`);
        console.log(`Creation Tx: ${createHash}`);
      }
      
    } catch (buyError: any) {
      console.error('❌ Buy failed:', buyError.message);
      console.log('');
      console.log('⚠️ Token was created but buy failed');
      console.log(`Token: ${tokenAddress}`);
      console.log(`Creation Tx: ${createHash}`);
      console.log('');
      console.log('💡 You can buy manually on https://four.meme');
    }
  } else {
    console.log('💡 No auto-buy (amount=0 or token address not found)');
    console.log('   You can buy manually on https://four.meme');
  }

  console.log('');
  console.log(JSON.stringify({
    success: true,
    tokenAddress: tokenAddress || 'Check BSCScan',
    creationTx: createHash,
    explorer: `https://bscscan.com/tx/${createHash}`
  }, null, 2));
}

main().catch((e) => {
  console.error('❌ Error:', e.message || e);
  process.exit(1);
});
