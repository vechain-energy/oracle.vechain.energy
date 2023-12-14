The sample `OracleCCIP.sol` and `utils` subdirectoy can be copied into `/contracts/contracts` directory to quick testing within the existing hardhard project:

```shell
cd example-consumers/ccip
cp -R contracts/* ../../contracts/contracts/
cd ../../contracts
yarn build
PRIVATE_KEY="0x…"  NETWORK=vechain yarn deploy OraclePublicUpdater
```