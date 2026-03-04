---
name: four-meme-complete
description: Complete standalone FOUR.MEME token creator. Create and manage tokens on FOUR.MEME platform without any external skill dependencies. Includes full API authentication flow, token creation, buying, and selling functionality.
---

# FOUR.MEME Complete Token Creator

完整的独立 FOUR.MEME 代币发行技能，**无需依赖其他技能**。

## ⚠️ 重要提示

**这是独立版本！** 所有依赖已包含，无需安装其他技能。

## 快速开始

### 1. 安装

```bash
cd four-meme-complete
npm install
```

### 2. 设置私钥

```bash
export PRIVATE_KEY="0x你的私钥"
```

### 3. 创建代币

**第一步：获取服务器签名**
```bash
npx tsx scripts/create-token-api.ts \
  /path/to/logo.jpg \
  "TOKEN NAME" \
  "SYMBOL" \
  "Description" \
  "AI"
```

**第二步：创建代币（仅创建，不买入）**
```bash
npx tsx scripts/create-token-chain.ts <createArg> <signature>
```

**第三步：买入代币（创建后）**
```bash
# 方法1：使用脚本
npx tsx scripts/buy-token.ts <代币地址> <BNB数量>

# 方法2：FOUR.MEME 前端（推荐）
# 打开 https://four.meme，搜索代币，点击 Buy
```

## 关键特性

✅ **完全独立** - 无需其他技能
✅ **完整依赖** - 所有 npm 包已包含
✅ **完整流程** - nonce → login → upload → create → chain
✅ **即用即走** - 安装依赖后即可使用

## 文件说明

| 文件 | 用途 |
|------|------|
| `scripts/create-token-api.ts` | 完整 API 认证流程 |
| `scripts/create-token-chain.ts` | 区块链执行（仅创建） |
| `scripts/buy-token.ts` | 买入代币 |
| `scripts/sell-token.ts` | 卖出代币 |
| `package.json` | 所有依赖已声明 |
| `tsconfig.json` | TypeScript 配置 |
| `guides/BUYING.md` | 买入代币指南 |

## 关键注意事项

### 1. 使用 shortName，不是 symbol
```javascript
// ✅ 正确
{ "shortName": "TKN" }

// ❌ 错误
{ "symbol": "TKN" }
```

### 2. 签名有有效期
获取后立即使用，不要保存。

### 3. 需要足够 BNB
建议至少 0.7 BNB（创建 + 买入 + Gas）。

## 故障排除

| 问题 | 原因 | 解决 |
|------|------|------|
| npm install 失败 | 网络问题 | 使用 npm 镜像或代理 |
| 脚本找不到模块 | 未安装依赖 | 运行 `npm install` |
| API 404 | 直接调用端点 | 使用完整脚本 |
| 签名无效 | 签名过期 | 重新获取签名 |

## 完整文档

查看 [README.md](README.md) 获取详细使用说明。

## 关键地址

- **Factory**: `0x5c952063c7fc8610ffdb798152d69f0b9550762b`
- **API Base**: `https://four.meme/meme-api/v1`

---

**独立版本** | 无需其他技能 | 即装即用
