# oracle.vechain.energy

## Components

* [**contracts/**](./contracts/) contains contracts to manage the on-chain-storage.
   * It provides access to the latest known value
   * And allows verified users to update the data
* [**reporter/**](./reporter/) is a Cloudflare Worker that collects & reports new values to the on-chain-contracts
   * Is configurable with a JSON-Object, to support different sources and multiple feeds
   * Extracts a final value and stores it in a contract

```mermaid
C4Dynamic
    Container(Consumer, "Consumer", "Contract on Vechain")
    ContainerDb(OracleContract, "Oracle Contract", "Data Storage")

    Container(OracleReporter, "Oracle Reporter", "Aggregator on Cloudflare")
    Component(DataSources, "Public APIs with verified value")

    Rel(OracleReporter, OracleContract, "updates", "updateValue(feedId, value, timestamp)")
    Rel(Consumer, OracleContract, "reads", "getLatestValue(feedId)")
    Rel(OracleReporter, DataSources, "reads", "values")
    Rel_Back(DataSources, OracleReporter, "provides", "values")


    UpdateRelStyle(OracleReporter, DataSources, $offsetX="-80", $offsetY="00")
    UpdateRelStyle(DataSources, OracleReporter, $offsetX="20", $offsetY="00")

    UpdateLayoutConfig($c4ShapeInRow="1", $c4BoundaryInRow="1")
```



## Processing Sequences

```mermaid
sequenceDiagram
    participant Admin
    participant Oracle-Reporter
    participant Oracle-Contract
    participant Data-Sources

    Admin->>Oracle-Reporter: Config Data Feed
    Oracle-Reporter->>Oracle-Reporter: create feed object
    loop every interval-seconds

      loop for each data source
        Oracle-Reporter->>Data-Sources: request data
        Data-Sources-->>Oracle-Reporter: reply or fail

       Oracle-Reporter-->>Oracle-Reporter: extract value
       end 

       Oracle-Reporter->>Oracle-Reporter: calculate average value

       Oracle-Reporter->>Oracle-Contract: request last value
       Oracle-Contract-->>Oracle-Reporter: last value + timestamp

        alt value deviated more than deviation threshold
          Oracle-Reporter->>Oracle-Contract: update data
        else opt value is older then max age threshold
          Oracle-Reporter->>Oracle-Contract: update data
      end
    end
```