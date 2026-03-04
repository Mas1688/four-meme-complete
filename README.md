# FOUR.MEME Complete Token Creator - Standalone Edition

完整的 FOUR.MEME 代币发行技能包，**无需依赖其他技能**，独立运行。

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd four-meme-complete
npm install
```

### 2. 设置私钥

```bash
export PRIVATE_KEY="0x你的私钥"
```

### 3. 创建代币 + 自动买入（推荐）

**一体化脚本 - 创建并自动买入：**
```bash
npx tsx scripts/create-and-buy.ts \
  /path/to/logo.jpg \
  "TOKEN NAME" \
  "SYMBOL" \
  "Token description" \
  "AI" \
  1  # 买入 1 BNB
```

### 或者分步操作

**第一步：获取服务器签名**
```bash
npx tsx scripts/create-token-api.ts \
  /path/to/logo.jpg \
  "TOKEN NAME" \
  "SYMBOL" \
  "Token description" \
  "AI"
```

**第二步：区块链执行**
```bash
npx tsx scripts/create-token-chain.ts \
  "0x...createArg..." \
  "0x...signature..."
```

---

## 📁 文件结构

```
four-meme-complete/
├── package.json              # 所有依赖已包含
├── tsconfig.json             # TypeScript 配置
├── README.md                 # 完整文档
├── SKILL.md                  # OpenClaw 技能文档
├── scripts/
│   ├── create-and-buy.ts     # ⭐ 创建+买入一体化（推荐）
│   ├── create-token-api.ts   # 完整 API 流程
│   ├── create-token-chain.ts # 区块链执行（仅创建）
│   ├── buy-token.ts          # 买入代币
│   └── sell-token.ts         # 卖出代币
├── guides/
│   └── BUYING.md             # 买入代币指南
└── references/
    └── api-details.md        # API 详细文档
```

---

## 🔧 完整依赖列表

所有依赖已包含在 `package.json` 中：

- `axios` - HTTP 请求
- `ethers` - 区块链交互
- `form-data` - 表单上传
- `minimist` - 命令行参数
- `tsx` - TypeScript 执行
- `typescript` - TypeScript 编译
- `viem` - 以太坊工具库

**无需手动安装其他包！**

---

## 📖 详细使用说明

### 方法 1：创建 + 买入一体化（推荐）

**最简单的方法！** 使用 `create-and-buy.ts` 脚本，一步完成创建和买入：

```bash
# 1. 设置环境变量
export PRIVATE_KEY="0x1234567890abcdef..."

# 2. 执行一体化脚本
npx tsx scripts/create-and-buy.ts \
  ./my-logo.jpg \
  "My AI Token" \
  "MAI" \
  "An AI-powered token on BSC" \
  "AI" \
  1  # 买入 1 BNB（可调整）
```

**脚本会自动：**
1. 获取 nonce
2. 登录获取 accessToken
3. 上传图片
4. 获取服务器签名
5. 创建代币（区块链上）
6. 自动买入（指定数量的 BNB）

### 方法 2：分步操作

如果需要分开操作：

```bash
# 1. 进入目录
cd four-meme-complete

# 2. 设置环境变量
export PRIVATE_KEY="0x1234567890abcdef..."

# 3. 准备图片（JPG/PNG，建议 500x500px）

# 4. 执行 API 流程获取签名
npx tsx scripts/create-token-api.ts \
  ./my-logo.jpg \
  "My AI Token" \
  "MAI" \
  "An AI-powered token on BSC" \
  "AI"

# 5. 复制输出的 createArg 和 signature

# 6. 执行区块链创建
npx tsx scripts/create-token-chain.ts \
  "0x7b226e616d65223a224d..." \
  "0x8f3d7c9a2b1e4f5..."
```

### 买入代币（创建后）

**重要**：`create-token-chain.ts` 只创建代币，**不会自动买入**！

创建后，使用以下方法买入：

**方法一：使用脚本**
```bash
npx tsx scripts/buy-token.ts <代币地址> <BNB数量>

# 示例：买入 1 BNB 的代币
npx tsx scripts/buy-token.ts 0x1234567890abcdef... 1
```

**方法二：FOUR.MEME 前端（推荐）**
1. 打开 https://four.meme
2. 连接钱包
3. 搜索你的代币
4. 点击 "Buy"

**如何获取代币地址？**
- 查看创建交易的 receipt（TokenCreated 事件）
- 或在 BSCScan 搜索你的钱包地址，查看最新交易

更多买入指南：[guides/BUYING.md](guides/BUYING.md)

### 卖出代币

```bash
npx tsx scripts/sell-token.ts \
  --token 0x代币地址 \
  --percentage 10
```

---

## ⚠️ 重要提示

### API 流程说明

FOUR.MEME 需要完整认证流程：

```
1. Nonce      → /private/user/nonce/generate
2. Login      → /private/user/login/dex (获取 accessToken)
3. Upload     → /private/token/upload (带 meme-web-access header)
4. Create     → /private/token/create (获取签名)
5. Blockchain → Factory 合约执行
```

**不要直接调用 API 端点！** 使用提供的脚本会自动完成所有步骤。

### 关键注意事项

1. **使用 `shortName`，不是 `symbol`**
   - API 只接受 `shortName` 字段

2. **签名有有效期**
   - 获取后立即使用

3. **需要足够 BNB**
   - 创建代币需要 ~0.7 BNB

4. **私钥安全**
   - 使用环境变量
   - 不要硬编码

---

## 🐛 故障排除

### 问题 1：API 返回 404

**原因**：直接调用 API，没有登录

**解决**：使用 `create-token-api.ts` 完整脚本

### 问题 2："symbol is not valid"

**原因**：使用了 symbol 字段

**解决**：API 请求中使用 `shortName`

### 问题 3：脚本找不到依赖

**原因**：没有运行 `npm install`

**解决**：
```bash
cd four-meme-complete
npm install
```

### 问题 4：TypeScript 错误

**解决**：
```bash
npm install -g tsx
# 或者
npx tsx scripts/create-token-api.ts
```

---

## 🔑 关键地址

| 名称 | 地址 |
|------|------|
| Factory | `0x5c952063c7fc8610ffdb798152d69f0b9550762b` |
| WBNB | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` |
| API Base | `https://four.meme/meme-api/v1` |

---

## 📚 更多信息

- [FOUR.MEME 官网](https://four.meme)
- [BSC 浏览器](https://bscscan.com)

---

**版本**: 1.0.0  
**更新日期**: 2026-03-04  
**作者**: CLAW
