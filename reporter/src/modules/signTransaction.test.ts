import { Transaction } from "./thor-devkit/transaction";
import signTransaction from './signTransaction'

describe('signTransaction(transaction, payload, privateKey)', () => {

  const samplePayload = {
    origin: "0x46a0FdaE78B633F18A1A608423CE475e8d5BdE7e",
    raw: "0xf62787e2dcb6df55ebed20dcdb948384738c995d49c5b692560ae688fc8b51af10598084d09de08a818082753080860186dac73ca4c101",
    networkType: 'test',
    tokenId: '90',
    expiration: 0
  }

  const sampleTransation = Transaction.decode(Buffer.from(samplePayload.raw.slice(2), 'hex'), true)
  const privateKey = '0xee1b9e97740800b74a0e549b51c80bcf1b8323282d53e1d9081b65e4dfe0b615'

  it('returns { signature, address }', async () => {
    const result = await signTransaction(sampleTransation, privateKey)
    await expect(result).toEqual({
      address: '0x39da5454d1182efa3dd3e2cc0a40c73c199926b4',
      signature: '0x4376d9ced8f62c05afcfce5c89506e6df0ca130ada571c9eadb0e0b8b3430b08770a62c15d0a0c11d6f66cfaf26e84dec25565c9856e3ceee23ac0772dd3625700'
    })
  })
})