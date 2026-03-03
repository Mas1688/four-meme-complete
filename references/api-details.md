# FOUR.MEME API 详细文档

## API 认证流程

FOUR.MEME 使用多层认证：

```
nonce → login → accessToken → API calls
```

## 详细步骤

### 1. 获取 Nonce

```http
POST /private/user/nonce/generate
Content-Type: application/json

{
  "accountAddress": "0x...",
  "verifyType": "LOGIN",
  "networkCode": "BSC"
}
```

**响应**：
```json
{
  "code": 0,
  "data": "123456"
}
```

### 2. 签名登录

```http
POST /private/user/login/dex
Content-Type: application/json

{
  "region": "WEB",
  "langType": "EN",
  "loginIp": "",
  "inviteCode": "",
  "verifyInfo": {
    "address": "0x...",
    "networkCode": "BSC",
    "signature": "0x...",
    "verifyType": "LOGIN"
  },
  "walletName": "MetaMask"
}
```

**签名消息格式**：
```
You are sign in Meme <nonce>
```

**响应**：
```json
{
  "code": 0,
  "data": "access-token-here"
}
```

### 3. 上传图片

```http
POST /private/token/upload
Content-Type: multipart/form-data
meme-web-access: <accessToken>

file: <image file>
```

**响应**：
```json
{
  "code": 0,
  "data": "https://static.four.meme/..."
}
```

### 4. 创建代币

```http
POST /private/token/create
Content-Type: application/json
meme-web-access: <accessToken>

{
  "name": "TOKEN NAME",
  "shortName": "SYMBOL",
  "desc": "Description",
  "label": "AI",
  "imgUrl": "https://static.four.meme/...",
  "totalSupply": 1000000000,
  "raisedAmount": 24,
  "saleRate": 0.8,
  "reserveRate": 0,
  "raisedToken": { ... },
  "launchTime": 1234567890,
  "lpTradingFee": 0.0025,
  "symbol": "BNB",
  "dexType": "PANCAKE_SWAP"
}
```

**响应**：
```json
{
  "code": 0,
  "data": {
    "createArg": "0x...",
    "signature": "0x..."
  }
}
```

## 区块链执行

使用 Factory 合约：

```solidity
function createAndBuyToken(bytes createArg, bytes signature) payable
```

**参数**：
- `createArg`: API 返回的创建参数
- `signature`: API 返回的服务器签名

**调用示例**：
```javascript
const tx = await factory.createAndBuyToken(
  createArg,
  signature,
  { value: ethers.parseEther('1') }
);
```

## 错误码

| 错误 | 说明 |
|------|------|
| 404 | 端点不存在或未认证 |
| 400 | 参数错误（检查 shortName vs symbol） |
| 401 | 认证失败（accessToken 无效） |
| 500 | 服务器错误 |

## 注意事项

1. **所有 API 都需要 accessToken**
   - 在 header 中携带 `meme-web-access`

2. **图片上传是 private**
   - 不是 `public/upload`，是 `private/token/upload`

3. **签名立即使用**
   - 获取后不要保存，立即上链

4. **shortName 不是 symbol**
   - API 只接受 `shortName` 字段
