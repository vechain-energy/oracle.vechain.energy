import { keccak256 } from './keccak';
/** address related utilities */
export var address;
(function (address) {
    /**
     * derive Address from public key, note that the public key is uncompressed
     * @param pub the public key
     */
    function fromPublicKey(pub) {
        return '0x' + keccak256(pub.slice(1)).slice(12).toString('hex');
    }
    address.fromPublicKey = fromPublicKey;
    /**
     * to check if a value presents an address
     * @param v the value to be checked
     */
    function test(v) {
        return typeof v === 'string' && /^0x[0-9a-f]{40}$/i.test(v);
    }
    address.test = test;
    /**
     * encode the address to checksumed address that is compatible with eip-55
     * @param address input address
     */
    function toChecksumed(addr) {
        if (!test(addr)) {
            throw new Error('invalid address');
        }
        addr = addr.slice(2).toLowerCase();
        const hash = keccak256(addr);
        let checksumed = '0x';
        for (let i = 0; i < addr.length; i++) {
            // tslint:disable-next-line:no-bitwise
            let byte = hash[i >> 1];
            if (i % 2 === 0) {
                // tslint:disable-next-line:no-bitwise
                byte >>= 4;
            }
            if (byte % 16 >= 8) {
                checksumed += addr[i].toUpperCase();
            }
            else {
                checksumed += addr[i];
            }
        }
        return checksumed;
    }
    address.toChecksumed = toChecksumed;
})(address || (address = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkcmVzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9hZGRyZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFFcEMsZ0NBQWdDO0FBQ2hDLE1BQU0sS0FBVyxPQUFPLENBNkN2QjtBQTdDRCxXQUFpQixPQUFPO0lBQ3BCOzs7T0FHRztJQUNILFNBQWdCLGFBQWEsQ0FBQyxHQUFXO1FBQ3JDLE9BQU8sSUFBSSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRmUscUJBQWEsZ0JBRTVCLENBQUE7SUFFRDs7O09BR0c7SUFDSCxTQUFnQixJQUFJLENBQUMsQ0FBTTtRQUN2QixPQUFPLE9BQU8sQ0FBQyxLQUFLLFFBQVEsSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0QsQ0FBQztJQUZlLFlBQUksT0FFbkIsQ0FBQTtJQUVEOzs7T0FHRztJQUNILFNBQWdCLFlBQVksQ0FBQyxJQUFZO1FBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDYixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7U0FDckM7UUFDRCxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNsQyxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFNUIsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFBO1FBQ3JCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2xDLHNDQUFzQztZQUN0QyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ2Isc0NBQXNDO2dCQUN0QyxJQUFJLEtBQUssQ0FBQyxDQUFBO2FBQ2I7WUFFRCxJQUFJLElBQUksR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFO2dCQUNoQixVQUFVLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFBO2FBQ3RDO2lCQUFNO2dCQUNILFVBQVUsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7YUFDeEI7U0FDSjtRQUNELE9BQU8sVUFBVSxDQUFBO0lBQ3JCLENBQUM7SUF2QmUsb0JBQVksZUF1QjNCLENBQUE7QUFDTCxDQUFDLEVBN0NnQixPQUFPLEtBQVAsT0FBTyxRQTZDdkIifQ==