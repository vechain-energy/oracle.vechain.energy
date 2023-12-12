import React from "react";
import { Interface, encodeBytes32String, formatUnits } from "ethers";

const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS
const NODE_URL = process.env.NODE_URL

const OracleInterface = new Interface([
    "function getLatestValue(bytes32 id) public view returns (uint128 value, uint128 updatedAt)",
]);

type OracleValue = {
    value: bigint;
    updatedAt: bigint;
};

export default function App() {
    const [lastValue, setLastValue] = React.useState<OracleValue | undefined>();
    React.useEffect(() => { getLatestValue().then(setLastValue); }, []);

    if (!lastValue) {
        return (<div className="text-center">Loading data …</div>);
    }

    return (
        <div className="w-full h-full flex justify-center m-4">
            <div className="text-center max-w-2xl w-full space-y-4">
                <div>Current Value: ${formatUnits(lastValue.value, 12)}</div>
                <div className="text-xs">Last Updated At: {new Date(Number(lastValue.updatedAt) * 1000).toISOString()}</div>
            </div>
        </div>
    );
}

async function getLatestValue(): Promise<OracleValue | undefined> {
    const response = (await (
        await fetch(`${NODE_URL}/accounts/*`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                clauses: [
                    {
                        to: ORACLE_ADDRESS,
                        data: OracleInterface.encodeFunctionData("getLatestValue", [
                            encodeBytes32String("vet-usd"),
                        ]),
                    },
                ],
            }),
        })
    ).json()) as { data: string; reverted: boolean }[];

    if (!Array.isArray(response) || !response.length || response[0].reverted) {
        return;
    }

    const { value, updatedAt } = OracleInterface.decodeFunctionResult(
        "getLatestValue",
        response[0].data
    ) as unknown as OracleValue;

    return { value, updatedAt };
}