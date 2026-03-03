import { ethers } from 'ethers';
import * as fs from 'fs';

// FOUR.MEME Router/Factory 地址
const FOUR_MEME_ROUTER = '0x5c952063c7fc8610ffdb798152d69f0b9550762b';
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

// 卖出代币
async function sellToken(tokenAddress: string, percentage: number) {
    const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
    
    const privateKey = process.env.PRIVATE_KEY || '0x90f9d1cf64d8b2f425d1dde21e108f85a3af3b3bbeb9291b9a926c0523211509';
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log(`[${new Date().toISOString()}] 准备卖出 ${percentage}% 的代币`);
    console.log(`代币地址: ${tokenAddress}`);
    console.log(`钱包地址: ${wallet.address}`);
    
    // 获取代币合约
    const tokenAbi = [
        'function balanceOf(address) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function decimals() view returns (uint8)'
    ];
    
    const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, wallet);
    
    // 获取余额
    const balance = await tokenContract.balanceOf(wallet.address);
    console.log(`当前代币余额: ${balance.toString()}`);
    
    // 计算卖出数量
    const sellAmount = balance * BigInt(percentage) / BigInt(100);
    console.log(`卖出数量 (${percentage}%): ${sellAmount.toString()}`);
    
    if (sellAmount === BigInt(0)) {
        console.log('余额为0，无法卖出');
        return;
    }
    
    // 授权 Router 使用代币
    console.log('授权 FOUR.MEME Router...');
    const approveTx = await tokenContract.approve(FOUR_MEME_ROUTER, sellAmount);
    await approveTx.wait();
    console.log(`授权成功: ${approveTx.hash}`);
    
    // 构建卖出交易
    // FOUR.MEME 的卖出函数签名
    const routerAbi = [
        'function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)'
    ];
    
    const router = new ethers.Contract(FOUR_MEME_ROUTER, routerAbi, wallet);
    
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20分钟有效期
    const path = [tokenAddress, WBNB];
    const amountOutMin = BigInt(0); // 接受任何价格（实际应计算滑点）
    
    console.log('执行卖出交易...');
    const sellTx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
        sellAmount,
        amountOutMin,
        path,
        wallet.address,
        deadline
    );
    
    console.log(`卖出交易已发送: ${sellTx.hash}`);
    const receipt = await sellTx.wait();
    console.log(`卖出成功！区块: ${receipt?.blockNumber}`);
    
    // 记录到日志
    fs.appendFileSync('/tmp/claw_sell_log.txt', `[${new Date().toISOString()}] 卖出成功: ${sellTx.hash}, 数量: ${sellAmount.toString()}\n`);
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('用法: npx tsx sell-token.ts <代币地址> <百分比>');
        process.exit(1);
    }
    
    const tokenAddress = args[0];
    const percentage = parseInt(args[1]);
    
    try {
        await sellToken(tokenAddress, percentage);
    } catch (error) {
        console.error('卖出失败:', error);
        process.exit(1);
    }
}

main();
