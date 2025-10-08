# Pre-Deployment Scripts

This repository provides tooling for deploying canonical helper contracts using pre-signed transactions. The script **automatically funds** deployment addresses from your account and broadcasts the pre-signed transactions.

## Overview

The deployment script uses the deterministic deployment proxy approach where:
1. Pre-signed transactions are already prepared with specific signatures
2. The script **automatically funds** the signer addresses with the required amount from your account
3. The script broadcasts the transactions using `cast publish`
4. Contracts are deployed to their canonical, deterministic addresses

## Supported Contracts

| Contract | Expected Address | Funding Address | Required Amount |
|----------|-----------------|-----------------|-----------------|
| Create2 Proxy (Arachnid) | `0x4e59b44847b379578588920cA78FbF26c0B4956C` | `0x3fAB184622Dc19b6109349B94811493BF2a45362` | 0.01 ETH |
| ERC2470 Singleton Factory | `0xce0042B868300000d44A59004Da54A005ffdcf9f` | `0xBb6e024b9cFFACB947A71991E386681B1Cd1477D` | 0.03 ETH |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` | `0x05f32b3cc3888453ff71b01135b34ff8e41263f2` | 0.1 ETH |
| Create2 Proxy (Zoltu) | `0x7A0D94F55792C434d74a40883C6ed8545E406D12` | `0x4c8D290a1B368ac4728d83a9e8321fC3af2b39b1` | 0.03 ETH |

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

Your funder account doesn't have enough balance. Make sure it has sufficient ETH/base token to cover all deployment funding requirements (typically 0.17 ETH total for all 4 contracts).

## Building Bytecode Artifacts

If you need to regenerate the bytecode artifacts (e.g., after updating contract sources):

```bash
npm run build:bytecodes
```

This will compile all contracts and update `artifacts/predeploy-bytecodes.json`.

## References

- [Arachnid Deterministic Deployment Proxy](https://github.com/Arachnid/deterministic-deployment-proxy)
- [ERC-2470 Singleton Factory](https://eips.ethereum.org/EIPS/eip-2470)
- [Multicall3](https://github.com/mds1/multicall)
- [CreateX](https://github.com/pcaversaccio/createx)

