const hre = require('hardhat')
const Spinner = require('./modules/Spinner')
const getNetworkName = require('./modules/getNetworkName')
const { readFileSync } = require('fs')
const { ARTIFACTS_DIR } = require('./modules/constants')

async function main () {
  // get contract name to call
  const contractName = process.argv[2]
  const functionName = process.argv[3]
  const args = process.argv.slice(4)

  if (!contractName || !functionName) {
    console.log('contract and function are required')
    console.log('yarn contract:call <Contract Name> <Function Name> <Args>')
    return
  }

  const network = await getNetworkName(hre)
  console.log(`\nWorking on **${String(network).toUpperCase()}** network\n`)

  const call = Spinner('Starting transaction')

  try {
    const networkArtifactsDir = `${ARTIFACTS_DIR}/${network}`
    const { address, abi } = JSON.parse(readFileSync(`${networkArtifactsDir}/${contractName}.json`))

    const funcAbi = abi.find(({ name }) => name === functionName)

    if (funcAbi.type !== 'function') {
      throw new Error(`${functionName} must be a known function`)
    }

    if (funcAbi.stateMutability === 'view') {
      call.info(`[${contractName}] ${address} calling ${functionName}(${args.join(', ')})`)
      const contract = await hre.thor.getContractAt(abi, address)
      const result = await contract[functionName](...args)
      call.succeed('Results:\n')
      console.log(result)
      return
    }

    call.info(`[${contractName}] ${address} executing ${functionName}(${args.join(', ')})`)
    const contract = await hre.thor.getContractAt(abi, address)
    const transaction = await contract[functionName](...args)
    const result = await transaction.wait()
    for (const event of result.events) {
      call.info(`[${contractName}] emitted ${event.eventSignature}`)
      call.info(`[${contractName}] \n${JSON.stringify(event.args, '', 2)}`)
    }
    call.info(`[${contractName}] Gas costs: ${result.gasUsed} VTHO`)
    call.succeed(`[${contractName}] Completed with Transaction Id ${result.transactionHash}`)
  } catch (err) {
    call.fail(`[${contractName}] ${err.message}`)
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
