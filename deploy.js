
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

// 1. 计算 init code hash
function getInitCodeHash() {
  const pairJson = JSON.parse(fs.readFileSync('./v2-core/build/UniswapV2Pair.json', 'utf8'));
  // 去掉0x前缀和runtime部分
  let bytecode = pairJson.bytecode;
  if (bytecode.startsWith('0x')) bytecode = bytecode.slice(2);
  // keccak256 计算
  const hash = ethers.keccak256('0x' + bytecode);
  return hash;
}

// 2. 替换 UniswapV2Library.sol 里的 init code hash
function replaceInitCodeHash(newHash) {
  const libPath = path.join(__dirname, 'v2-periphery/contracts/libraries/UniswapV2Library.sol');
  let content = fs.readFileSync(libPath, 'utf8');
  // 匹配 hex'xxxx' 并替换
  content = content.replace(/hex'[0-9a-fA-F]+'(\s*\/\/ init code hash)/, `hex'${newHash.slice(2)}'$1`);
  fs.writeFileSync(libPath, content);
  console.log('已替换 init code hash:', newHash);
}

// 3. 编译合约
function compileContracts() {
  console.log('正在编译 v2-periphery...');
  child_process.execSync('yarn --cwd v2-periphery compile', { stdio: 'inherit' });
  console.log('编译完成');
}


// 全局 nonce 管理
let nextNonce = null;

// 获取钱包和初始化 nonce
async function getWalletAndNonce() {
  const provider = new ethers.JsonRpcProvider('http://localhost:8545');
  const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const wallet = new ethers.Wallet(privateKey, provider);
  if (nextNonce === null) {
    nextNonce = await wallet.getNonce();
  }
  return wallet;
}

// 4. 部署 UniswapV2Factory
async function deployFactory() {
  const wallet = await getWalletAndNonce();
  const json = JSON.parse(fs.readFileSync('./v2-core/build/UniswapV2Factory.json', 'utf8'));
  const factory = new ethers.ContractFactory(json.abi, json.bytecode, wallet);
  const contract = await factory.deploy(wallet.address, { nonce: nextNonce++ });
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log('Factory 部署地址:', address);
  return { contract, address, wallet };
}


// 5. 简单测试调用
async function testFactory(factoryContract) {
  const feeToSetter = await factoryContract.feeToSetter();
  console.log('feeToSetter:', feeToSetter);
}


// 6. 部署 WETH9
async function deployWETH9(wallet) {
  const json = JSON.parse(fs.readFileSync('./v2-periphery/build/WETH9.json', 'utf8'));
  const factory = new ethers.ContractFactory(json.abi, json.bytecode, wallet);
  const contract = await factory.deploy({ nonce: nextNonce++ });
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log('WETH9 部署地址:', address);
  return { contract, address };
}


// 7. 部署 UniswapV2Router02
async function deployRouter02(wallet, factoryAddress, wethAddress) {
  const json = JSON.parse(fs.readFileSync('./v2-periphery/build/UniswapV2Router02.json', 'utf8'));
  const factory = new ethers.ContractFactory(json.abi, json.bytecode, wallet);
  const contract = await factory.deploy(factoryAddress, wethAddress, { nonce: nextNonce++ });
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log('Router02 部署地址:', address);
  return { contract, address };
}

// 8. 部署ERC20测试币
async function deployERC20(wallet, totalSupply) {
  const json = JSON.parse(fs.readFileSync('./v2-periphery/build/ERC20.json', 'utf8'));
  const factory = new ethers.ContractFactory(json.abi, json.bytecode, wallet);
  const contract = await factory.deploy(totalSupply, { nonce: nextNonce++ });
  await contract.waitForDeployment();
  return contract;
}


// 9. 添加流动性测试并验证
async function addLiquidityTest(router, tokenA, tokenB, wallet, factoryAddress) {
  // approve
  await (await tokenA.approve(router.target, ethers.parseUnits('1000', 18), { nonce: nextNonce++ })).wait();
  await (await tokenB.approve(router.target, ethers.parseUnits('1000', 18), { nonce: nextNonce++ })).wait();
  // addLiquidity
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
  const tx = await router.addLiquidity(
    tokenA.target,
    tokenB.target,
    ethers.parseUnits('100', 18),
    ethers.parseUnits('100', 18),
    0, 0,
    wallet.address,
    deadline,
    { nonce: nextNonce++ }
  );
  const receipt = await tx.wait();
  console.log('addLiquidity tx:', receipt.hash);

  // === 验证流动性 ===
  // 1. 查询 Pair 地址
  const factoryJson = JSON.parse(fs.readFileSync('./v2-core/build/UniswapV2Factory.json', 'utf8'));
  const factory = new ethers.Contract(factoryAddress, factoryJson.abi, wallet);
  const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
  console.log('Pair 地址:', pairAddress);
  // 2. 查询 LP Token 余额
  const pairJson = JSON.parse(fs.readFileSync('./v2-core/build/UniswapV2Pair.json', 'utf8'));
  const pair = new ethers.Contract(pairAddress, pairJson.abi, wallet);
  const lpBalance = await pair.balanceOf(wallet.address);
  console.log('LP Token 余额:', ethers.formatUnits(lpBalance, 18));
  // 3. 查询储备
  const reserves = await pair.getReserves();
  console.log('Pair 储备:',
    'reserve0:', ethers.formatUnits(reserves[0], 18),
    'reserve1:', ethers.formatUnits(reserves[1], 18)
  );
}


// 主流程
async function main() {
  // 1. 计算 hash
  const hash = getInitCodeHash();
  // 2. 替换
  replaceInitCodeHash(hash);
  // 3. 编译
  compileContracts();
  // 4. 部署 Factory
  const { contract: factoryContract, address: factoryAddress, wallet } = await deployFactory();
  // 5. 测试 Factory
  await testFactory(factoryContract);
  // 6. 部署 WETH9
  const { address: wethAddress } = await deployWETH9(wallet);
  // 7. 部署 Router02
  const { address: routerAddress } = await deployRouter02(wallet, factoryAddress, wethAddress);
  // 8. 部署两个ERC20
  const tokenA = await deployERC20(wallet, ethers.parseUnits('1000000', 18));
  const tokenB = await deployERC20(wallet, ethers.parseUnits('1000000', 18));
  console.log('TokenA:', await tokenA.getAddress());
  console.log('TokenB:', await tokenB.getAddress());
  // 9. 添加流动性
  const routerJson = JSON.parse(fs.readFileSync('./v2-periphery/build/UniswapV2Router02.json', 'utf8'));
  const router = new ethers.Contract(routerAddress, routerJson.abi, wallet);
  await addLiquidityTest(router, tokenA, tokenB, wallet, factoryAddress);
  // 10. 输出所有关键合约地址
  console.log('=== 部署完成 ===');
  console.log('Factory:', factoryAddress);
  console.log('WETH9:', wethAddress);
  console.log('Router02:', routerAddress);
  console.log('TokenA:', await tokenA.getAddress());
  console.log('TokenB:', await tokenB.getAddress());
}

main().catch(e => { console.error(e); process.exit(1); });