const hre = require('hardhat')
const Spinner = require('./modules/Spinner')
const getNetworkName = require('./modules/getNetworkName')
const { writeFileSync, existsSync, mkdirSync } = require('fs')
const ERC1967Proxy = require('@openzeppelin/contracts/build/contracts/ERC1967Proxy.json')
const Web3EthAbi = require('web3-eth-abi')
const { ARTIFACTS_DIR } = require('./modules/constants')

async function main () {
  // get contract names to deploy
  const contractNames = process.argv.slice(2)


  if (!contractNames.length) {
    throw new Error('No contract names for deployment given')
  }

  const network = await getNetworkName(hre)
  console.log(`\nDeploying to **${String(network).toUpperCase()}** network\n`)

  // ensure artifact directory in web app exists
  const networkArtifactsDir = `${ARTIFACTS_DIR}/${network}`
  if (!existsSync(networkArtifactsDir)) {
    mkdirSync(networkArtifactsDir, { recursive: true })
  }

  for (const contractName of contractNames) {
    const deploying = Spinner(`[${contractName}] Deploying Contract `)

    // get contract to deploy
    const Contract = await hre.thor.getContractFactory(contractName)
    const { abi } = await hre.artifacts.readArtifact(contractName)

    // deploy and wait for result
    const deployedContract = await Contract.deploy()
    await deployedContract.deployed()

    deploying.info(`[${contractName}] Transaction Id: ${deployedContract.deployTransaction.hash}`)
    deploying.info(`[${contractName}] Contract is now available at ${deployedContract.address}`)

    // calculate initialize() call during deployment
    const callInitialize = Web3EthAbi.encodeFunctionCall(
      abi.find(({ name }) => name === 'initialize'), []
    )

    // deploy proxy
    deploying.text = `[${contractName}] Deploying ERC1967Proxy in front of contract`
    const Proxy = await hre.thor.getContractFactory(ERC1967Proxy.abi, ERC1967Proxy.bytecode)
    const proxy = await Proxy.deploy(deployedContract.address, callInitialize)

    // archive contract interface and address
    writeFileSync(`${networkArtifactsDir}/${contractName}.json`, JSON.stringify({ address: proxy.address, implementationAddress: deployedContract.address, abi }, '', 2))
    deploying.info(`[${contractName}] Artifact written to ${networkArtifactsDir}/${contractName}.json`)

    deploying.succeed(`[${contractName}] Proxied Contract is now available at ${proxy.address}\n`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
