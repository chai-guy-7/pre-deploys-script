# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Deploy contracts (uses ts-node directly)
npm run deploy -- [options]

# Dry-run deployment (no transactions broadcast)
npm run deploy -- --dry-run

# Deploy specific contracts
npm run deploy -- --contracts create2,multicall3 --dry-run

# Rebuild contract bytecodes (rarely needed)
npm run build:bytecodes
```

## Environment Setup

Copy `.env.example` to `.env` and populate:
- `FUNDER_PRIVATE_KEY` — 0x-prefixed private key for auto-funding deployer addresses
- `L2_RPC_URL` — RPC endpoint (defaults to zkSync mainnet)

## Architecture

This is a single-script TypeScript tool (`scripts/deploy-predeploys.ts`) that deploys 6 canonical helper contracts on EVM-compatible L2 networks using **pre-signed transactions** — meaning the deployment transactions are hardcoded raw hex in the script itself, not generated at runtime.

### Deployment Flow

1. For each selected contract, check if it's already deployed via `provider.getCode()`
2. Check the funding address balance (each contract has a dedicated deployer address that needs ETH)
3. If balance is insufficient, auto-fund from the `FUNDER_PRIVATE_KEY` wallet using ethers.js
4. Broadcast the pre-signed transaction via Foundry's `cast publish`
5. Verify the deployment via `cast code`

### Key Design Decisions

- **Pre-signed transactions** are used because canonical contracts must be deployed from specific addresses to land at deterministic addresses — the private keys for those deployer addresses are publicly known (burnt keys)
- **ethers.js** handles only funding transfers; actual deployments go through `cast publish` (Foundry must be installed)
- **Dry-run mode** skips all RPC calls and shows what would be deployed

### Contracts

| Key | Label | Deployed Address |
|-----|-------|-----------------|
| `create2` | Create2 Proxy (Arachnid) | `0x4e59b44847b379578588920cA78FbF26c0B4956C` |
| `erc2470` | ERC2470 Singleton Factory | `0xce0042B868300000d44A59004Da54A005ffdcf9f` |
| `multicall3` | Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |
| `zoltu` | Create2 Proxy (Zoltu) | `0x7A0D94F55792C434d74a40883C6ed8545E406D12` |
| `createx` | CreateX | `0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed` |
| `universal_deployer` | Universal Deployer | `0x1b926fbb24a9f78dcdd3272f2d86f5d0660e59c0` |

## External Dependencies

- **Foundry** (`cast`) must be installed and on PATH — used for `cast publish` and `cast code`
- **Node.js 18.9.0+** required
