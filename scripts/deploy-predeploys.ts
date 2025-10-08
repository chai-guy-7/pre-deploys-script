import { readFile } from 'node:fs/promises'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { Command } from 'commander'
import { config as loadEnv } from 'dotenv'
import { JsonRpcProvider, Wallet, parseEther } from 'ethers'

loadEnv()

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ARTIFACT_PATH = path.join(ROOT, 'artifacts', 'predeploy-bytecodes.json')
const TARGETS = ['l2'] as const

type TargetOption = (typeof TARGETS)[number]

interface CliOptions {
  l2Rpc?: string
  funderPrivateKey?: string
  target: TargetOption
  contracts?: string[]
  dryRun?: boolean
  confirm?: boolean
}

interface DeploymentArtifact {
  label: string
  abi: unknown[]
  bytecode: string
  compiler: string
  language: string
}

interface ArtifactEntry extends DeploymentArtifact {
  key: string
}

interface PreSignedDeployment {
  key: string
  label: string
  deployedAddress: string
  fundingAddress: string
  fundingAmount: string
  rawTransaction: string
}

interface DeploymentSummary {
  chain: 'l2'
  key: string
  label: string
  deployedAddress?: string
  transactionHash?: string
  fundingAddress?: string
  fundingAmount?: string
  funded?: boolean
  published?: boolean
}

// Pre-signed deployment transactions based on deterministic deployment proxy approach
const PRE_SIGNED_DEPLOYMENTS: PreSignedDeployment[] = [
  {
    key: 'create2_proxy_arachnid',
    label: 'Create2 Proxy (Arachnid)',
    deployedAddress: '0x4e59b44847b379578588920cA78FbF26c0B4956C',
    fundingAddress: '0x3fAB184622Dc19b6109349B94811493BF2a45362',
    fundingAmount: '0.01',
    rawTransaction: '0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222'
  },
  {
    key: 'erc2470_singleton_factory',
    label: 'ERC2470 Singleton Factory',
    deployedAddress: '0xce0042B868300000d44A59004Da54A005ffdcf9f',
    fundingAddress: '0xBb6e024b9cFFACB947A71991E386681B1Cd1477D',
    fundingAmount: '0.03',
    rawTransaction: '0xf9016c8085174876e8008303c4d88080b90154608060405234801561001057600080fd5b50610134806100206000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80634af63f0214602d575b600080fd5b60cf60048036036040811015604157600080fd5b810190602081018135640100000000811115605b57600080fd5b820183602082011115606c57600080fd5b80359060200191846001830284011164010000000083111715608d57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550509135925060eb915050565b604080516001600160a01b039092168252519081900360200190f35b6000818351602085016000f5939250505056fea26469706673582212206b44f8a82cb6b156bfcc3dc6aadd6df4eefd204bc928a4397fd15dacf6d5320564736f6c634300060200331b83247000822470'
  },
  {
    key: 'multicall3',
    label: 'Multicall3',
    deployedAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    fundingAddress: '0x05f32b3cc3888453ff71b01135b34ff8e41263f2',
    fundingAmount: '0.1',
    rawTransaction: '0xf90f538085174876e800830f42408080b90f00608060405234801561001057600080fd5b50610ee0806100206000396000f3fe6080604052600436106100f35760003560e01c80634d2301cc1161008a578063a8b0574e11610059578063a8b0574e1461025a578063bce38bd714610275578063c3077fa914610288578063ee82ac5e1461029b57600080fd5b80634d2301cc146101ec57806372425d9d1461022157806382ad56cb1461023457806386d516e81461024757600080fd5b80633408e470116100c65780633408e47014610191578063399542e9146101a45780633e64a696146101c657806342cbb15c146101d957600080fd5b80630f28c97d146100f8578063174dea711461011a578063252dba421461013a57806327e86d6e1461015b575b600080fd5b34801561010457600080fd5b50425b6040519081526020015b60405180910390f35b61012d610128366004610a85565b6102ba565b6040516101119190610bbe565b61014d610148366004610a85565b6104ef565b604051610111929190610bd8565b34801561016757600080fd5b50437fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0140610107565b34801561019d57600080fd5b5046610107565b6101b76101b2366004610c60565b610690565b60405161011193929190610cba565b3480156101d257600080fd5b5048610107565b3480156101e557600080fd5b5043610107565b3480156101f857600080fd5b50610107610207366004610ce2565b73ffffffffffffffffffffffffffffffffffffffff163190565b34801561022d57600080fd5b5044610107565b61012d610242366004610a85565b6106ab565b34801561025357600080fd5b5045610107565b34801561026657600080fd5b50604051418152602001610111565b61012d610283366004610c60565b61085a565b6101b7610296366004610a85565b610a1a565b3480156102a757600080fd5b506101076102b6366004610d18565b4090565b60606000828067ffffffffffffffff8111156102d8576102d8610d31565b60405190808252806020026020018201604052801561031e57816020015b6040805180820190915260008152606060208201528152602001906001900390816102f65790505b5092503660005b8281101561047757600085828151811061034157610341610d60565b6020026020010151905087878381811061035d5761035d610d60565b905060200281019061036f9190610d8f565b6040810135958601959093506103886020850185610ce2565b73ffffffffffffffffffffffffffffffffffffffff16816103ac6060870187610dcd565b6040516103ba929190610e32565b60006040518083038185875af1925050503d80600081146103f7576040519150601f19603f3d011682016040523d82523d6000602084013e6103fc565b606091505b50602080850191909152901515808452908501351761046d577f08c379a000000000000000000000000000000000000000000000000000000000600052602060045260176024527f4d756c746963616c6c333a2063616c6c206661696c656400000000000000000060445260846000fd5b5050600101610325565b508234146104e6576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601a60248201527f4d756c746963616c6c333a2076616c7565206d69736d6174636800000000000060448201526064015b60405180910390fd5b50505092915050565b436060828067ffffffffffffffff81111561050c5761050c610d31565b60405190808252806020026020018201604052801561053f57816020015b606081526020019060019003908161052a5790505b5091503660005b8281101561068657600087878381811061056257610562610d60565b90506020028101906105749190610e42565b92506105836020840184610ce2565b73ffffffffffffffffffffffffffffffffffffffff166105a66020850185610dcd565b6040516105b4929190610e32565b6000604051808303816000865af19150503d80600081146105f1576040519150601f19603f3d011682016040523d82523d6000602084013e6105f6565b606091505b5086848151811061060957610609610d60565b602090810291909101015290508061067d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601760248201527f4d756c746963616c6c333a2063616c6c206661696c656400000000000000000060448201526064016104dd565b50600101610546565b5050509250929050565b43804060606106a086868661085a565b905093509350939050565b6060818067ffffffffffffffff8111156106c7576106c7610d31565b60405190808252806020026020018201604052801561070d57816020015b6040805180820190915260008152606060208201528152602001906001900390816106e55790505b5091503660005b828110156104e657600084828151811061073057610730610d60565b6020026020010151905086868381811061074c5761074c610d60565b905060200281019061075e9190610e76565b925061076d6020840184610ce2565b73ffffffffffffffffffffffffffffffffffffffff166107906040850185610dcd565b60405161079e929190610e32565b6000604051808303816000865af19150503d80600081146107db576040519150601f19603f3d011682016040523d82523d6000602084013e6107e0565b606091505b506020808401919091529015158083529084013517610851577f08c379a000000000000000000000000000000000000000000000000000000000600052602060045260176024527f4d756c746963616c6c333a2063616c6c206661696c656400000000000000000060445260646000fd5b50600101610714565b6060818067ffffffffffffffff81111561087657610876610d31565b6040519080825280602002602001820160405280156108bc57816020015b6040805180820190915260008152606060208201528152602001906001900390816108945790505b5091503660005b82811015610a105760008482815181106108df576108df610d60565b602002602001015190508686838181106108fb576108fb610d60565b905060200281019061090d9190610e42565b925061091c6020840184610ce2565b73ffffffffffffffffffffffffffffffffffffffff1661093f6020850185610dcd565b60405161094d929190610e32565b6000604051808303816000865af19150503d806000811461098a576040519150601f19603f3d011682016040523d82523d6000602084013e61098f565b606091505b506020830152151581528715610a07578051610a07576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601760248201527f4d756c746963616c6c333a2063616c6c206661696c656400000000000000000060448201526064016104dd565b506001016108c3565b5050509392505050565b6000806060610a2b60018686610690565b919790965090945092505050565b60008083601f840112610a4b57600080fd5b50813567ffffffffffffffff811115610a6357600080fd5b6020830191508360208260051b8501011115610a7e57600080fd5b9250929050565b60008060208385031215610a9857600080fd5b823567ffffffffffffffff811115610aaf57600080fd5b610abb85828601610a39565b90969095509350505050565b6000815180845260005b81811015610aed57602081850181015186830182015201610ad1565b81811115610aff576000602083870101525b50601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0169290920160200192915050565b600082825180855260208086019550808260051b84010181860160005b84811015610bb1578583037fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe001895281518051151584528401516040858501819052610b9d81860183610ac7565b9a86019a9450505090830190600101610b4f565b5090979650505050505050565b602081526000610bd16020830184610b32565b9392505050565b600060408201848352602060408185015281855180845260608601915060608160051b870101935082870160005b82811015610c52577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa0888703018452610c40868351610ac7565b95509284019290840190600101610c06565b509398975050505050505050565b600080600060408486031215610c7557600080fd5b83358015158114610c8557600080fd5b9250602084013567ffffffffffffffff811115610ca157600080fd5b610cad86828701610a39565b9497909650939450505050565b838152826020820152606060408201526000610cd96060830184610b32565b95945050505050565b600060208284031215610cf457600080fd5b813573ffffffffffffffffffffffffffffffffffffffff81168114610bd157600080fd5b600060208284031215610d2a57600080fd5b5035919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b600082357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff81833603018112610dc357600080fd5b9190910192915050565b60008083357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe1843603018112610e0257600080fd5b83018035915067ffffffffffffffff821115610e1d57600080fd5b602001915036819003821315610a7e57600080fd5b8183823760009101908152919050565b600082357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc1833603018112610dc357600080fd5b600082357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa1833603018112610dc357600080fdfea2646970667358221220bb2b5c71a328032f97c676ae39a1ec2148d3e5d6f73d95e9b17910152d61f16264736f6c634300080c00331ca0edce47092c0f398cebf3ffc267f05c8e7076e3b89445e0fe50f6332273d4569ba01b0b9d000e19b24c5869b0fc3b22b0d6fa47cd63316875cbbd577d76e6fde086'
  },
  {
    key: 'create2_proxy_zoltu',
    label: 'Create2 Proxy (Zoltu)',
    deployedAddress: '0x7A0D94F55792C434d74a40883C6ed8545E406D12',
    fundingAddress: '0x4c8D290a1B368ac4728d83a9e8321fC3af2b39b1',
    fundingAmount: '0.03',
    rawTransaction: '0xf87e8085174876e800830186a08080ad601f80600e600039806000f350fe60003681823780368234f58015156014578182fd5b80825250506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222'
  }
]

const program = new Command()
  .option('--l2-rpc <url>', 'L2 RPC URL', process.env.L2_RPC_URL)
  .option('--funder-private-key <hex>', 'Private key to fund deployment addresses (0x-prefixed)', process.env.FUNDER_PRIVATE_KEY)
  .option('--target <target>', 'Deployment target: l2', (value: string) => value.toLowerCase(), 'l2')
  .option('--contracts <list>', 'Comma-separated contract keys (defaults to all)', (value: string) => value.split(',').map(entry => entry.trim()).filter(Boolean))
  .option('--dry-run', 'Print actions without broadcasting transactions', false)
  .option('--confirm', 'Skip interactive confirmation prompt', false)

program.parse(process.argv)
const options = program.opts<CliOptions>()

if (!TARGETS.includes(options.target)) {
  console.error(`Invalid target '${options.target}'. Expected: l2`)
  process.exit(1)
}

if (!options.dryRun && !options.l2Rpc) {
  console.error('Missing L2 RPC URL. Provide --l2-rpc or set L2_RPC_URL in .env.')
  process.exit(1)
}

if (!options.dryRun && !options.funderPrivateKey) {
  console.error('Missing funder private key. Provide --funder-private-key or set FUNDER_PRIVATE_KEY in .env.')
  process.exit(1)
}

function normalizePrivateKey(key: string): string {
  return key.startsWith('0x') ? key : `0x${key}`
}

async function loadDeployments(selectedKeys?: string[]): Promise<PreSignedDeployment[]> {
  let deployments = PRE_SIGNED_DEPLOYMENTS

  if (selectedKeys && selectedKeys.length > 0) {
    const availableKeys = new Set(PRE_SIGNED_DEPLOYMENTS.map(d => d.key))
    const missing = selectedKeys.filter(key => !availableKeys.has(key))
    if (missing.length) {
      throw new Error(`Unknown contract key(s): ${missing.join(', ')}. Available: ${Array.from(availableKeys).join(', ')}`)
    }
    const keySet = new Set(selectedKeys)
    deployments = deployments.filter(({ key }) => keySet.has(key))
  }

  return deployments
}

function askConfirmation(question: string): Promise<boolean> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}

async function checkBalance(provider: JsonRpcProvider, address: string): Promise<bigint> {
  return await provider.getBalance(address)
}

function formatEther(wei: bigint): string {
  // Simple formatting: divide by 10^18 and show up to 6 decimals
  const ethValue = Number(wei) / 1e18
  return ethValue.toFixed(6)
}

async function deployOnL2(params: {
  deployments: PreSignedDeployment[]
  rpcUrl?: string
  funderPrivateKey?: string
  dryRun: boolean
}): Promise<DeploymentSummary[]> {
  const { deployments, rpcUrl, funderPrivateKey, dryRun } = params

  if (dryRun) {
    console.log(`\n[L2] Dry run mode.`)
    console.log('No RPC checks or transactions will be broadcast.')
    return deployments.map(deployment => ({
      chain: 'l2' as const,
      key: deployment.key,
      label: deployment.label,
      deployedAddress: deployment.deployedAddress,
      fundingAddress: deployment.fundingAddress,
      fundingAmount: deployment.fundingAmount
    }))
  }

  const provider = new JsonRpcProvider(rpcUrl)
  const funderWallet = new Wallet(funderPrivateKey!, provider)
  const results: DeploymentSummary[] = []

  console.log('\n[L2] Checking funding addresses and deploying contracts...')
  console.log(`Funder address: ${funderWallet.address}`)

  for (const deployment of deployments) {
    console.log(`\n[L2] ${deployment.label}`)
    console.log(`  Key: ${deployment.key}`)
    console.log(`  Expected address: ${deployment.deployedAddress}`)
    console.log(`  Funding address: ${deployment.fundingAddress}`)
    console.log(`  Required funding: ${deployment.fundingAmount} ETH`)

    // Check if already deployed
    const code = await provider.getCode(deployment.deployedAddress)
    if (code !== '0x') {
      console.log(`  ✓ Already deployed (code exists at ${deployment.deployedAddress})`)
      results.push({
        chain: 'l2',
        key: deployment.key,
        label: deployment.label,
        deployedAddress: deployment.deployedAddress,
        fundingAddress: deployment.fundingAddress,
        fundingAmount: deployment.fundingAmount,
        funded: true,
        published: false // Already exists, not published by us
      })
      continue
    }

    // Check funding address balance
    const balance = await checkBalance(provider, deployment.fundingAddress)
    const requiredWei = parseEther(deployment.fundingAmount)
    const isFunded = balance >= requiredWei

    console.log(`  Funding balance: ${formatEther(balance)} ETH (required: ${deployment.fundingAmount} ETH)`)

    if (!isFunded) {
      console.log(`  ⚠ Insufficient balance. Funding address with ${deployment.fundingAmount} ETH...`)
      try {
        const fundingTx = await funderWallet.sendTransaction({
          to: deployment.fundingAddress,
          value: requiredWei
        })
        console.log(`  📤 Funding tx sent: ${fundingTx.hash}`)
        await fundingTx.wait()
        console.log(`  ✓ Funding confirmed`)
      } catch (error: any) {
        console.error(`  ✗ Failed to fund address: ${error.message}`)
        results.push({
          chain: 'l2',
          key: deployment.key,
          label: deployment.label,
          deployedAddress: deployment.deployedAddress,
          fundingAddress: deployment.fundingAddress,
          fundingAmount: deployment.fundingAmount,
          funded: false,
          published: false
        })
        continue
      }
    } else {
      console.log(`  ✓ Already funded`)
    }

    // Publish the pre-signed transaction
    console.log(`  ✓ Funded. Publishing pre-signed transaction...`)
    try {
      const result = execSync(
        `cast publish ${deployment.rawTransaction} --rpc-url ${rpcUrl}`,
        { encoding: 'utf8', stdio: 'pipe' }
      )
      const txHash = result.trim()
      console.log(`  ✓ Published tx: ${txHash}`)
      
      // Verify deployment by checking contract code
      console.log(`  🔍 Verifying deployment...`)
      try {
        const codeResult = execSync(
          `cast code ${deployment.deployedAddress} --rpc-url ${rpcUrl}`,
          { encoding: 'utf8', stdio: 'pipe' }
        )
        const code = codeResult.trim()
        
        if (code === '0x' || code === '' || code === '0x0') {
          console.error(`  ✗ Verification failed: No code at ${deployment.deployedAddress}`)
          results.push({
            chain: 'l2',
            key: deployment.key,
            label: deployment.label,
            deployedAddress: deployment.deployedAddress,
            transactionHash: txHash,
            fundingAddress: deployment.fundingAddress,
            fundingAmount: deployment.fundingAmount,
            funded: true,
            published: false
          })
          continue
        }
        
        console.log(`  ✓ Verified: Contract deployed at ${deployment.deployedAddress}`)
        console.log(`  ✓ Code size: ${(code.length - 2) / 2} bytes`)
        
        results.push({
          chain: 'l2',
          key: deployment.key,
          label: deployment.label,
          deployedAddress: deployment.deployedAddress,
          transactionHash: txHash,
          fundingAddress: deployment.fundingAddress,
          fundingAmount: deployment.fundingAmount,
          funded: true,
          published: true
        })
      } catch (verifyError: any) {
        console.error(`  ⚠ Verification check failed: ${verifyError.message}`)
        console.log(`  ℹ Transaction was published but verification couldn't complete`)
        results.push({
          chain: 'l2',
          key: deployment.key,
          label: deployment.label,
          deployedAddress: deployment.deployedAddress,
          transactionHash: txHash,
          fundingAddress: deployment.fundingAddress,
          fundingAmount: deployment.fundingAmount,
          funded: true,
          published: true
        })
      }
    } catch (error: any) {
      console.error(`  ✗ Failed to publish: ${error.message}`)
      results.push({
        chain: 'l2',
        key: deployment.key,
        label: deployment.label,
        deployedAddress: deployment.deployedAddress,
        fundingAddress: deployment.fundingAddress,
        fundingAmount: deployment.fundingAmount,
        funded: true,
        published: false
      })
    }
  }

  return results
}

async function main() {
  const deployments = await loadDeployments(options.contracts)
  console.log(`Loaded ${deployments.length} pre-signed deployment(s).`)

  console.log('\nSelected options:')
  console.log(`  Target: ${options.target}`)
  console.log(`  L2 RPC: ${options.l2Rpc ?? 'n/a'}`)
  console.log(`  Dry run: ${options.dryRun ? 'yes' : 'no'}`)

  console.log('\nContracts to deploy:')
  for (const deployment of deployments) {
    console.log(`  - ${deployment.label} (${deployment.key})`)
    console.log(`    Expected address: ${deployment.deployedAddress}`)
    console.log(`    Funding address:  ${deployment.fundingAddress}`)
    console.log(`    Required amount:  ${deployment.fundingAmount} ETH`)
  }

  if (!options.confirm && !options.dryRun) {
    const confirmed = await askConfirmation('\nProceed with deployment checks and publishing? (y/N): ')
    if (!confirmed) {
      console.log('Aborted by user.')
      process.exit(0)
    }
  }

  const summary = await deployOnL2({
    deployments,
    rpcUrl: options.l2Rpc,
    funderPrivateKey: options.funderPrivateKey ? normalizePrivateKey(options.funderPrivateKey) : undefined,
    dryRun: Boolean(options.dryRun)
  })

  console.log('\n' + '='.repeat(60))
  console.log('DEPLOYMENT SUMMARY')
  console.log('='.repeat(60))
  
  for (const item of summary) {
    console.log(`\n[${item.chain.toUpperCase()}] ${item.label}`)
    console.log(`  Key:              ${item.key}`)
    console.log(`  Expected Address: ${item.deployedAddress}`)
    
    if (item.fundingAddress) {
      console.log(`  Funding Address:  ${item.fundingAddress}`)
      console.log(`  Required Amount:  ${item.fundingAmount} ETH`)
    }
    
    if (item.funded !== undefined) {
      console.log(`  Funded:           ${item.funded ? '✓ Yes' : '✗ No'}`)
    }
    
    if (item.published !== undefined) {
      console.log(`  Published:        ${item.published ? '✓ Yes' : '✗ No (already exists or failed)'}`)
    }
    
    if (item.transactionHash) {
      console.log(`  Transaction:      ${item.transactionHash}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  
  if (options.dryRun) {
    console.log('\nDry run complete. No transactions were broadcast.')
  } else {
    const needsFunding = summary.filter(s => s.funded === false)
    const failed = summary.filter(s => s.funded === true && s.published === false && !s.transactionHash)
    
    if (needsFunding.length > 0) {
      console.log('\n⚠ Action Required:')
      console.log('The following contracts need funding before they can be deployed:')
      for (const item of needsFunding) {
        console.log(`  - Send ${item.fundingAmount} ETH to ${item.fundingAddress}`)
        console.log(`    (for ${item.label})`)
      }
    }
    
    if (failed.length > 0) {
      console.log('\n✗ Some deployments failed. Check the logs above for details.')
    }
    
    const succeeded = summary.filter(s => s.published === true)
    if (succeeded.length > 0) {
      console.log(`\n✓ Successfully deployed ${succeeded.length} contract(s).`)
    }
  }
}

main().catch(error => {
  console.error('Deployment failed:', error)
  process.exit(1)
})
