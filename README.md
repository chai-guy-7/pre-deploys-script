# Pre-Deployment Scripts

This repository provides tooling for deploying canonical helper contracts using pre-signed transactions. The script **automatically funds** deployment addresses from your account and broadcasts the pre-signed transactions.

## Overview

The deployment script uses the deterministic deployment proxy approach where:
1. Pre-signed transactions are already prepared with specific signatures
2. The script **automatically funds** the signer addresses with the required amount from your account
3. The script broadcasts the transactions using `cast publish`
4. Contracts are deployed to their canonical, deterministic addresses

The repository includes a reproducible toolchain for pre-deploying canonical helper contracts. The workflow compiles the upstream sources deterministically, loads bytecode from a checked-in artifact, and provides a CLI for broadcasting deployments on L2 using pre-signed transactions.

## Supported Contracts

| Contract | Expected Address | Funding Address | Required Amount |
|----------|-----------------|-----------------|-----------------|
| Create2 Proxy (Arachnid) | `0x4e59b44847b379578588920cA78FbF26c0B4956C` | `0x3fAB184622Dc19b6109349B94811493BF2a45362` | 0.01 ETH |
| ERC2470 Singleton Factory | `0xce0042B868300000d44A59004Da54A005ffdcf9f` | `0xBb6e024b9cFFACB947A71991E386681B1Cd1477D` | 0.03 ETH |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` | `0x05f32b3cc3888453ff71b01135b34ff8e41263f2` | 0.1 ETH |
| Create2 Proxy (Zoltu) | `0x7A0D94F55792C434d74a40883C6ed8545E406D12` | `0x4c8D290a1B368ac4728d83a9e8321fC3af2b39b1` | 0.03 ETH |
| CreateX | `0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed` | `0xeD456e05CaAb11d66C4c797dD6c1D6f9A7F352b5` | 0.3 ETH |

## Prerequisites

- Node.js >= 18.9.0
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (for `cast` command)
- An L2 RPC URL (for the target network)
- A funded account with private key (for funding deployment addresses)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your configuration:
   ```bash
   cat > .env << EOF
   L2_RPC_URL=https://your-l2-rpc-url
   FUNDER_PRIVATE_KEY=0xYourPrivateKeyHere
   EOF
   ```

   The `FUNDER_PRIVATE_KEY` account will be used to automatically fund deployment addresses with the required amounts.

## Usage

### Dry Run (Check Status)

Check which contracts need funding and which are already deployed:

```bash
npm run deploy -- --dry-run
```

### Deploy All Contracts

Deploy all supported contracts (the script will check funding and skip already deployed contracts):

```bash
npm run deploy -- --confirm
```

### Deploy Specific Contracts

Deploy only certain contracts by specifying their keys:

```bash
npm run deploy -- --contracts create2_proxy_arachnid,multicall3 --confirm
```

Available contract keys:
- `create2_proxy_arachnid`
- `erc2470_singleton_factory`
- `multicall3`
- `create2_proxy_zoltu`
- `createx`

### Interactive Mode

If you omit `--confirm`, the script will ask for confirmation before proceeding:

```bash
npm run deploy
```

### CLI Options

```
Options:
  --l2-rpc <url>              L2 RPC URL (or set L2_RPC_URL env var)
  --funder-private-key <hex>  Private key to fund deployment addresses (or set FUNDER_PRIVATE_KEY env var)
  --target <target>           Deployment target: l2 (default: "l2")
  --contracts <list>          Comma-separated contract keys (defaults to all)
  --dry-run                   Print actions without broadcasting transactions
  --confirm                   Skip interactive confirmation prompt
  -h, --help                  Display help
```

## How It Works

1. **Check if already deployed**: The script checks if each contract already exists at its expected address
2. **Check funding**: For contracts that need deployment, it verifies the funding address has sufficient balance
3. **Auto-fund if needed**: If not funded, the script automatically sends the required amount from your funder account
4. **Publish transaction**: Uses `cast publish` to broadcast the pre-signed transaction
5. **Verify deployment**: Uses `cast code` to verify the contract was deployed to the correct address
6. **Report results**: Shows which contracts were deployed, funded, verified, and which already existed

## Example Output

```
Loaded 4 pre-signed deployment(s).

Selected options:
  Target: l2
  L2 RPC: https://testnet.era.zksync.dev
  Dry run: no

Contracts to deploy:
  - Create2 Proxy (Arachnid) (create2_proxy_arachnid)
    Expected address: 0x4e59b44847b379578588920cA78FbF26c0B4956C
    Funding address:  0x3fAB184622Dc19b6109349B94811493BF2a45362
    Required amount:  0.01 ETH

[L2] Checking funding addresses and deploying contracts...
Funder address: 0xYourFunderAddress...

[L2] Create2 Proxy (Arachnid)
  Key: create2_proxy_arachnid
  Expected address: 0x4e59b44847b379578588920cA78FbF26c0B4956C
  Funding address: 0x3fAB184622Dc19b6109349B94811493BF2a45362
  Required funding: 0.01 ETH
  Funding balance: 0.000000 ETH (required: 0.01 ETH)
  ⚠ Insufficient balance. Funding address with 0.01 ETH...
  📤 Funding tx sent: 0xabcd...1234
  ✓ Funding confirmed
  ✓ Funded. Publishing pre-signed transaction...
  ✓ Published tx: 0x5678...9abc
  🔍 Verifying deployment...
  ✓ Verified: Contract deployed at 0x4e59b44847b379578588920cA78FbF26c0B4956C
  ✓ Code size: 69 bytes

============================================================
DEPLOYMENT SUMMARY
============================================================

[L2] Create2 Proxy (Arachnid)
  Key:              create2_proxy_arachnid
  Expected Address: 0x4e59b44847b379578588920cA78FbF26c0B4956C
  Funding Address:  0x3fAB184622Dc19b6109349B94811493BF2a45362
  Required Amount:  0.01 ETH
  Funded:           ✓ Yes
  Published:        ✓ Yes
  Transaction:      0x1234...5678

============================================================

✓ Successfully deployed 1 contract(s).
```

## Automatic Funding

The script automatically handles funding! When a deployment address doesn't have sufficient balance, the script will:

1. Detect the insufficient balance
2. Send the exact required amount from your funder account
3. Wait for the funding transaction to confirm
4. Proceed to publish the pre-signed deployment transaction

No manual intervention needed - just make sure your funder account has enough balance to cover all required amounts.

## Frequently Asked Questions

### What does the funder account pay for?

Your funder account sends the exact amounts needed (0.01, 0.03, or 0.1 ETH) to specific deployment addresses. Those addresses then use that ETH to pay for gas when the pre-signed transactions are broadcast. Your account does NOT directly deploy the contracts - it just funds the special addresses that do.

### What if the contract is already deployed?

The script automatically detects deployed contracts and skips them. You'll see a "✓ Already deployed" message and won't be charged anything.

### What if the deployment address is already funded?

The script checks balances first and only sends funding if needed. If an address already has sufficient balance, it skips the funding step and proceeds directly to publish the pre-signed transaction.

### How does verification work?

After each deployment, the script runs `cast code <address>` to verify that bytecode exists at the expected address. If no code is found, the deployment is marked as failed. The script also reports the code size for your reference.

### Can I use this on custom base token networks?

Yes! The script works with any EVM-compatible L2, including those using custom base tokens. Just make sure your funder account has sufficient base token balance.

### Why these specific amounts (0.01, 0.03, 0.1 ETH)?

These are the exact gas amounts required by the pre-signed transactions. They're fixed and cannot be changed - they're part of the deterministic deployment process that ensures the same addresses across all networks.

## Custom Base Token Networks

For networks using a custom base token (not ETH), the script will automatically use the base token. Just ensure your funder account has sufficient balance in that token.

## Troubleshooting

### `cast: command not found`

Install Foundry: https://book.getfoundry.sh/getting-started/installation

### Missing funder private key

Set `FUNDER_PRIVATE_KEY` in your `.env` file or use `--funder-private-key` flag. This account will be used to automatically fund deployment addresses.

### Transaction already exists

If you see an error about the transaction already existing, it likely means the contract is already deployed. The script should skip it automatically.

### Failed to fund address

Your funder account doesn't have enough balance. Make sure it has sufficient ETH/base token to cover all deployment funding requirements (typically 0.47 ETH total for all 5 contracts).

## Project Layout

- `contracts/vendor/` – Vendored upstream sources preserved verbatim for auditability
- `contracts/SingletonFactory.sol` – Minimal ERC-2470 implementation used for compilation
- `scripts/build-bytecodes.ts` – TypeScript script that compiles sources into artifacts
- `scripts/deploy-predeploys.ts` – TypeScript CLI for deploying using ethers
- `artifacts/predeploy-bytecodes.json` – Machine-readable compilation results
- `.env.example` – Template showing required environment variables
- `package.json` – Runtime and build-time dependencies

## Contract Details

| Key | Label | Compiler | Notes |
| --- | --- | --- | --- |
| `create2_proxy_arachnid` | Create2 Proxy (Arachnid) | `solc v0.5.8` | Minimal CREATE2 helper; salt in calldata slot 0, init code appended. |
| `create2_proxy_zoltu` | Create2 Proxy (Zoltu) | `solc v0.5.8` | Functionally identical bytecode to Arachnid/Safe version. |
| `erc2470_singleton_factory` | ERC2470 Singleton Factory | `solc v0.7.6` | Standard deterministic CREATE2 factory emitting `Deployed(addr,salt)`. |
| `multicall3` | Multicall3 | `solc v0.8.12` | Aggregate multiple read-only calls in a single transaction. |
| `createx` | CreateX | `solc v0.8.23` | Full-featured factory supporting CREATE, CREATE2, and CREATE3 flows. |

## Manual Deployment (Advanced)

> **Note:** The automated script handles all of this for you. These steps are provided for reference or manual deployment only.

If you need to manually deploy without the script:

### Create2 Proxy (Arachnid)
```bash
# 1. Send 0.01 ETH to 0x3fAB184622Dc19b6109349B94811493BF2a45362
# 2. Publish the transaction
cast publish 0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222 --rpc-url $L2_RPC
```

### ERC2470 Singleton Factory
```bash
# 1. Send 0.03 ETH to 0xBb6e024b9cFFACB947A71991E386681B1Cd1477D
# 2. Publish the transaction
cast publish 0xf9016c8085174876e8008303c4d88080b90154608060405234801561001057600080fd5b50610134806100206000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80634af63f0214602d575b600080fd5b60cf60048036036040811015604157600080fd5b810190602081018135640100000000811115605b57600080fd5b820183602082011115606c57600080fd5b80359060200191846001830284011164010000000083111715608d57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550509135925060eb915050565b604080516001600160a01b039092168252519081900360200190f35b6000818351602085016000f5939250505056fea26469706673582212206b44f8a82cb6b156bfcc3dc6aadd6df4eefd204bc928a4397fd15dacf6d5320564736f6c634300060200331b83247000822470 --rpc-url $L2_RPC
```

### Multicall3
```bash
# 1. Send 0.1 ETH to 0x05f32b3cc3888453ff71b01135b34ff8e41263f2
# 2. Publish the transaction
cast publish 0xf90f538085174876e800830f42408080b90f00608060405234801561001057600080fd5b50610ee0806100206000396000f3fe6080604052600436106100f35760003560e01c80634d2301cc1161008a578063a8b0574e11610059578063a8b0574e1461025a578063bce38bd714610275578063c3077fa914610288578063ee82ac5e1461029b57600080fd5b80634d2301cc146101ec57806372425d9d1461022157806382ad56cb1461023457806386d516e81461024757600080fd5b80633408e470116100c65780633408e47014610191578063399542e9146101a45780633e64a696146101c657806342cbb15c146101d957600080fd5b80630f28c97d146100f8578063174dea711461011a578063252dba421461013a57806327e86d6e1461015b575b600080fd5b34801561010457600080fd5b50425b6040519081526020015b60405180910390f35b61012d610128366004610a85565b6102ba565b6040516101119190610bbe565b61014d610148366004610a85565b6104ef565b604051610111929190610bd8565b34801561016757600080fd5b50437fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0140610107565b34801561019d57600080fd5b5046610107565b6101b76101b2366004610c60565b610690565b60405161011193929190610cba565b3480156101d257600080fd5b5048610107565b3480156101e557600080fd5b5043610107565b3480156101f857600080fd5b50610107610207366004610ce2565b73ffffffffffffffffffffffffffffffffffffffff163190565b34801561022d57600080fd5b5044610107565b61012d610242366004610a85565b6106ab565b34801561025357600080fd5b5045610107565b34801561026657600080fd5b50604051418152602001610111565b61012d610283366004610c60565b61085a565b6101b7610296366004610a85565b610a1a565b3480156102a757600080fd5b506101076102b6366004610d18565b4090565b60606000828067ffffffffffffffff8111156102d8576102d8610d31565b60405190808252806020026020018201604052801561031e57816020015b6040805180820190915260008152606060208201528152602001906001900390816102f65790505b5092503660005b8281101561047757600085828151811061034157610341610d60565b6020026020010151905087878381811061035d5761035d610d60565b905060200281019061036f9190610d8f565b6040810135958601959093506103886020850185610ce2565b73ffffffffffffffffffffffffffffffffffffffff16816103ac6060870187610dcd565b6040516103ba929190610e32565b60006040518083038185875af1925050503d80600081146103f7576040519150601f19603f3d011682016040523d82523d6000602084013e6103fc565b606091505b50602080850191909152901515808452908501351761046d577f08c379a000000000000000000000000000000000000000000000000000000000600052602060045260176024527f4d756c746963616c6c333a2063616c6c206661696c656400000000000000000060445260846000fd5b5050600101610325565b508234146104e6576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601a60248201527f4d756c746963616c6c333a2076616c7565206d69736d6174636800000000000060448201526064015b60405180910390fd5b50505092915050565b436060828067ffffffffffffffff81111561050c5761050c610d31565b60405190808252806020026020018201604052801561053f57816020015b606081526020019060019003908161052a5790505b5091503660005b8281101561068657600087878381811061056257610562610d60565b90506020028101906105749190610e42565b92506105836020840184610ce2565b73ffffffffffffffffffffffffffffffffffffffff166105a66020850185610dcd565b6040516105b4929190610e32565b6000604051808303816000865af19150503d80600081146105f1576040519150601f19603f3d011682016040523d82523d6000602084013e6105f6565b606091505b5086848151811061060957610609610d60565b602090810291909101015290508061067d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601760248201527f4d756c746963616c6c333a2063616c6c206661696c656400000000000000000060448201526064016104dd565b50600101610546565b5050509250929050565b43804060606106a086868661085a565b905093509350939050565b6060818067ffffffffffffffff8111156106c7576106c7610d31565b60405190808252806020026020018201604052801561070d57816020015b6040805180820190915260008152606060208201528152602001906001900390816106e55790505b5091503660005b828110156104e657600084828151811061073057610730610d60565b6020026020010151905086868381811061074c5761074c610d60565b905060200281019061075e9190610e76565b925061076d6020840184610ce2565b73ffffffffffffffffffffffffffffffffffffffff166107906040850185610dcd565b60405161079e929190610e32565b6000604051808303816000865af19150503d80600081146107db576040519150601f19603f3d011682016040523d82523d6000602084013e6107e0565b606091505b506020808401919091529015158083529084013517610851577f08c379a000000000000000000000000000000000000000000000000000000000600052602060045260176024527f4d756c746963616c6c333a2063616c6c206661696c656400000000000000000060445260646000fd5b50600101610714565b6060818067ffffffffffffffff81111561087657610876610d31565b6040519080825280602002602001820160405280156108bc57816020015b6040805180820190915260008152606060208201528152602001906001900390816108945790505b5091503660005b82811015610a105760008482815181106108df576108df610d60565b602002602001015190508686838181106108fb576108fb610d60565b905060200281019061090d9190610e42565b925061091c6020840184610ce2565b73ffffffffffffffffffffffffffffffffffffffff1661093f6020850185610dcd565b60405161094d929190610e32565b6000604051808303816000865af19150503d806000811461098a576040519150601f19603f3d011682016040523d82523d6000602084013e61098f565b606091505b506020830152151581528715610a07578051610a07576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601760248201527f4d756c746963616c6c333a2063616c6c206661696c656400000000000000000060448201526064016104dd565b506001016108c3565b5050509392505050565b6000806060610a2b60018686610690565b919790965090945092505050565b60008083601f840112610a4b57600080fd5b50813567ffffffffffffffff811115610a6357600080fd5b6020830191508360208260051b8501011115610a7e57600080fd5b9250929050565b60008060208385031215610a9857600080fd5b823567ffffffffffffffff811115610aaf57600080fd5b610abb85828601610a39565b90969095509350505050565b6000815180845260005b81811015610aed57602081850181015186830182015201610ad1565b81811115610aff576000602083870101525b50601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0169290920160200192915050565b600082825180855260208086019550808260051b84010181860160005b84811015610bb1578583037fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe001895281518051151584528401516040858501819052610b9d81860183610ac7565b9a86019a9450505090830190600101610b4f565b5090979650505050505050565b602081526000610bd16020830184610b32565b9392505050565b600060408201848352602060408185015281855180845260608601915060608160051b870101935082870160005b82811015610c52577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa0888703018452610c40868351610ac7565b95509284019290840190600101610c06565b509398975050505050505050565b600080600060408486031215610c7557600080fd5b83358015158114610c8557600080fd5b9250602084013567ffffffffffffffff811115610ca157600080fd5b610cad86828701610a39565b9497909650939450505050565b838152826020820152606060408201526000610cd96060830184610b32565b95945050505050565b600060208284031215610cf457600080fd5b813573ffffffffffffffffffffffffffffffffffffffff81168114610bd157600080fd5b600060208284031215610d2a57600080fd5b5035919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b600082357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff81833603018112610dc357600080fd5b9190910192915050565b60008083357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe1843603018112610e0257600080fd5b83018035915067ffffffffffffffff821115610e1d57600080fd5b602001915036819003821315610a7e57600080fd5b8183823760009101908152919050565b600082357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc1833603018112610dc357600080fd5b600082357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa1833603018112610dc357600080fdfea2646970667358221220bb2b5c71a328032f97c676ae39a1ec2148d3e5d6f73d95e9b17910152d61f16264736f6c634300080c00331ca0edce47092c0f398cebf3ffc267f05c8e7076e3b89445e0fe50f6332273d4569ba01b0b9d000e19b24c5869b0fc3b22b0d6fa47cd63316875cbbd577d76e6fde086 --rpc-url $L2_RPC
```

### Create2 Proxy (Zoltu)
```bash
# 1. Send 0.03 ETH to 0x4c8D290a1B368ac4728d83a9e8321fC3af2b39b1
# 2. Publish the transaction
cast publish 0xf87e8085174876e800830186a08080ad601f80600e600039806000f350fe60003681823780368234f58015156014578182fd5b80825250506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222 --rpc-url $L2_RPC
```

### CreateX
```bash
# 1. Send 0.3 ETH to 0xeD456e05CaAb11d66C4c797dD6c1D6f9A7F352b5
# 2. Publish the transaction (note: very long transaction, truncated for readability)
cast publish 0xf92f698085174876e800832dc6c08080b92f16... --rpc-url $L2_RPC
```

## References

- [Create2 Proxy (Arachnid)](https://github.com/Arachnid/deterministic-deployment-proxy)
- [ERC-2470 Singleton Factory](https://eips.ethereum.org/EIPS/eip-2470)
- [Multicall3](https://github.com/mds1/multicall)
- [CreateX](https://github.com/pcaversaccio/createx)
- [Create2 Proxy (Zoltu)](https://github.com/Zoltu/deterministic-deployment-proxy)
