<!--
 * @Author: Mr.Car
 * @Date: 2025-08-10 12:47:42
-->
### 部署要点
1. 安装 node.js 10 以兼容依赖
```shell
nvm install 10
nvm use 10
npm install yarn -g
yarn install
```

2. 保证 core / periphery 测试通过:

```shell
(base) ➜  v2-core git:(master) yarn test
yarn run v1.22.22
warning ../../../../package.json: No license field
$ yarn compile
warning ../../../../package.json: No license field
$ yarn clean
warning ../../../../package.json: No license field
$ rimraf ./build/
$ waffle .waffle.json
$ mocha


  UniswapV2ERC20
    ✓ name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH (161ms)
    ✓ approve (110ms)
    ✓ transfer (116ms)
    ✓ transfer:fail (49ms)
    ✓ transferFrom (204ms)
    ✓ transferFrom:max (175ms)
    ✓ permit (154ms)

  UniswapV2Factory
    ✓ feeTo, feeToSetter, allPairsLength (42ms)
    ✓ createPair (300ms)
    ✓ createPair:reverse (367ms)
    ✓ createPair:gas (121ms)
    ✓ setFeeTo (80ms)
    ✓ setFeeToSetter (87ms)

  UniswapV2Pair
    ✓ mint (238ms)
    ✓ getInputPrice:0 (281ms)
    ✓ getInputPrice:1 (351ms)
    ✓ getInputPrice:2 (295ms)
    ✓ getInputPrice:3 (272ms)
    ✓ getInputPrice:4 (281ms)
    ✓ getInputPrice:5 (269ms)
    ✓ getInputPrice:6 (274ms)
    ✓ optimistic:0 (305ms)
    ✓ optimistic:1 (266ms)
    ✓ optimistic:2 (268ms)
    ✓ optimistic:3 (267ms)
    ✓ swap:token0 (301ms)
    ✓ swap:token1 (304ms)
    ✓ swap:gas (287ms)
    ✓ burn (337ms)
    ✓ price{0,1}CumulativeLast (411ms)
    ✓ feeTo:off (339ms)
    ✓ feeTo:on (471ms)


  32 passing (9s)

✨  Done in 34.19s.
```

### 部署
1. 启动节点：

```shell
启动 anvil

```
2. 执行部署脚本：先部署factory，再查到 pair 的hash 替换 periphery 中的魔法值，最后部署合约，完成添加流动性测试

```shell
nvm use 24 # 切换回24
node deploy.js
```

```shell
(base) ➜  uniswapV2_easy_deploy node deploy.js

已替换 init code hash: 0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f
正在编译 v2-periphery...
yarn run v1.22.22
warning ../../../../package.json: No license field
$ yarn clean
warning ../../../../package.json: No license field
$ rimraf ./build/
$ waffle .waffle.json
$ yarn copy-v1-artifacts
warning ../../../../package.json: No license field
$ ncp ./buildV1 ./build
✨  Done in 6.32s.
编译完成
Factory 部署地址: 0x610178dA211FEF7D417bC0e6FeD39F05609AD788
feeToSetter: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
WETH9 部署地址: 0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e
Router02 部署地址: 0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0
TokenA: 0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82
TokenB: 0x9A676e781A523b5d0C0e43731313A708CB607508
addLiquidity tx: 0x0c1667654fd9de1655eab3d17122b38534dd4076f9e3db1c063bac98c6adce9e
Pair 地址: 0xd060491C853f61474A9c2541Bd367Da787216D39
LP Token 余额: 99.999999999999999
Pair 储备: reserve0: 100.0 reserve1: 100.0
=== 部署完成 ===
Factory: 0x610178dA211FEF7D417bC0e6FeD39F05609AD788
WETH9: 0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e
Router02: 0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0
TokenA: 0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82
TokenB: 0x9A676e781A523b5d0C0e43731313A708CB607508
```