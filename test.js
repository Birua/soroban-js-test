
var SorobanClient = require('soroban-client');
const xdr = SorobanClient.xdr;

// Configure SorobanClient to talk to the soroban-rpc
const server = new SorobanClient.Server(
    "https://rpc-futurenet.stellar.org:443/", { allowHttp: true }
  );
  
const settings = {   
    "rpc_url": "https://rpc-futurenet.stellar.org:443/",
    "contract": {
        "id": "aeffd0faafd7b4a6c0c1055d13ce5289439fbd68bca0bc7df2d3c4c3b39582c1"
    },
    "tokenA": {
        "address": "",
        "id": "da44264a095bb043cb188e395ae3093bdd109be861651db52ef60037bedd838f"
    },
    "tokenB": {
        "address": "",
        "id": "269cf2f517b913121d531770d7d874c56b01f4e387dfe7b86ed9e5baaf56896b"
    },
    "user1": {
        "address": "GBSRIX5LXT7XJUCZYSZ2OV7PGBFNP6HXVPXJFDIG65TCZKSTCCF3DZUD",
        "secret": "SC5HO4YE6TVLKPG2G2ICUQTBUBFPTQY5563N5XCG2EM3JJU2XSGNPUNH"
    },
    };

function measureExecutionTimeAsync(func) {
  return async function (...args) {
    const startTime = performance.now(); // Start measuring time

    // Call the provided asynchronous function with the arguments
    const result = await func(...args);

    const endTime = performance.now(); // Stop measuring time
    const executionTime = endTime - startTime;

    console.log(`  Function ${func.name} took ${executionTime | 0} milliseconds to execute.`);

    return result;
  };
}

async function tx_send(func_name, user_address, user_secret, args) {
  const account = await server.getAccount(user_address);
  const fee = 100;
  const contract = new SorobanClient.Contract(settings.contract.id);
  let transaction = new SorobanClient.TransactionBuilder(account, {
      fee,
      networkPassphrase: SorobanClient.Networks.FUTURENET,
    })
    .addOperation(contract.call(func_name, ...args))
    .setTimeout(30)
    .build();

  transaction = await server.prepareTransaction(transaction);
  const sourceKeypair = SorobanClient.Keypair.fromSecret(user_secret);
  transaction.sign(sourceKeypair);

  let response = await server.sendTransaction(transaction);
  let tx_hash = response.hash;
  // console.log('Response:', JSON.stringify(response, null, 2));
  while (response.status != "SUCCESS") {
      console.log(`  Waiting... ${response.status}`);
      // Wait 1 seconds
      await new Promise(resolve => setTimeout(resolve, 1000));
      // See if the transaction is complete
      response = await server.getTransaction(tx_hash);
    }
  console.log('  Transaction status:', response.status);
  const result = xdr.TransactionResult.fromXDR(response.resultXdr, 'base64');
  return result;
}

// Converts string to xdr scvU128 object
function toU128(string_number) {
    const u128String = string_number;
  
    // Convert the u128 string to BigInt
    const u128 = BigInt(u128String);
  
    // Extract the lo and hi parts as u64
    const lo = BigInt(u128 & BigInt("0xFFFFFFFFFFFFFFFF"));
    const hi = BigInt(u128 >> BigInt(64)) & BigInt("0xFFFFFFFFFFFFFFFF");
  
    // Extract the lo and hi parts of lo and hi
    // const loLo = BigInt(lo & BigInt("0xFFFFFFFF"));
    // const loHi = BigInt(lo >> BigInt(32)) & BigInt("0xFFFFFFFF");
    // const hiLo = BigInt(hi & BigInt("0xFFFFFFFF"));
    // const hiHi = BigInt(hi >> BigInt(32)) & BigInt("0xFFFFFFFF");
  
    // // Extract the lo and hi parts
    // const u128_lo = new xdr.Uint64(Number(loLo), Number(loHi));
    // const u128_hi = new xdr.Uint64(Number(hiLo), Number(hiHi));
    const u128_lo = new xdr.Uint64(lo);
    const u128_hi = new xdr.Uint64(hi);
    // console.log("u128_lo:", u128_lo);
    // console.log("u128_hi:", u128_hi);

    const scvU128 = xdr.ScVal.scvU128(new xdr.UInt128Parts({ lo: u128_lo, hi: u128_hi }));
    // const scvU128 = xdr.ScVal.scvU128(u128);
    
    // console.log("scvU128:", scvU128);

    return scvU128;
}

// Converts xdr scvU128 number to the string
function scvU128toString(scvU128_number) {
    // extracting lo and hi parts
    let xdr_u128 = scvU128_number._value._attributes;

    // console.debug(xdr_u128);

    const a = xdr_u128.hi;
    const b = xdr_u128.lo;

    // Convert the lo and hi parts to BigInt
    const hiPart = BigInt(a._value);
    const loPart = BigInt(b._value);
    // const loPart = BigInt(xdr_u128.lo.low) + (BigInt(xdr_u128.lo.high) << BigInt(32));
    // const hiPart = BigInt(xdr_u128.hi.low) + (BigInt(xdr_u128.hi.high) << BigInt(32));


    // Combine the lo and hi parts to form the full uint128 value
    const fullValue = (hiPart << BigInt(64)) + loPart;

    // Convert the fullValue to a string
    const valueString = fullValue.toString();

    return valueString;
}

// Function gets part of the decoded XDR object with the resulting data
function processValue(value) {
    const textDecoder = new TextDecoder('utf-8');
    // get name of the Data Type from the object
    const name = value._switch.name;
    // console.debug("Value name:", name);
    const _value = value._value;
    
    if (name === "scvU128") {
        // Decode the uint128 value to the string
        return scvU128toString(value);
    } else if (name === "scvI128") {
        // Decode the int128 value to the string
        return scvU128toString(value);
    } else if (name === "scvU64") {
        var data = _value.data;
        if (data === undefined) {
            data = _value;
        }
        return BigInt(data).toString();
    }  else if (name === "scvU32") {
        var data = _value.data;
        if (data === undefined) {
            data = _value;
        }
        return BigInt(data).toString();
    } else if (name === "scvBytes") {
        // Decode the Base64 string to binary data
        const binary = Buffer.from(_value, 'base64');
        // Convert the binary data to a hexadecimal string
        const hexString = binary.toString('hex');
        return hexString;
    } else if (name === "scvSymbol") {
        var data = _value.data;
        if (data === undefined) {
            data = _value;
        }
        return textDecoder.decode(new Uint8Array(data));
    } else if (name === "scvVec") {
        // Vector is used for Enums, extracting name of the enum
        // var data = _value[0]._value;
        var data = _value[0]._value.data;
        if (data === undefined) {
            data = _value[0]._value;
        }
        return textDecoder.decode(new Uint8Array(data));
    } else if (name === "scvAddress") {
        // Encode the address data as Ed25519 public key using SorobanClient.StrKey
        // var data = value._value._value.data;
        // console.log("scvAddress", value._value._value);
        var data = value._value._value.data;
        if (data === undefined) {
            data = value._value._value._value.data;
        }
        if (data === undefined) {
            data = value._value._value._value;
        }
        if (data === undefined) {
            data = value._value._value;
        }
        return SorobanClient.StrKey.encodeEd25519PublicKey(data);
    } else {
        return null; // Return null or handle other cases as needed
    }
  }

async function buy_limit(
  user_address,
  base_amnt, 
  base_asst,
  quot_asst,
  max_price,
  quote_id) {
  // pub fn buy_limit(env: Env, 
  // user: Address, base_amnt: u128, 
  // base_asst: Address, quot_asst: Address, 
  // max_price: u128, quote_id: Symbol) -> u128 
  const func_name = "buy_limit";
  const args = [
    new SorobanClient.Address(user_address).toScVal(),
    toU128(base_amnt), 
    SorobanClient.Address.contract(Buffer.alloc(32,base_asst, "hex")).toScVal(),
    SorobanClient.Address.contract(Buffer.alloc(32,quot_asst, "hex")).toScVal(),
    toU128(max_price),
    xdr.ScVal.scvSymbol(quote_id),
    ];

  const result = await tx_send(
    func_name, 
    user_address, 
    settings[Object.keys(settings).find(key => settings[key].address === user_address)].secret, 
    args
    );

  return  processValue(result._attributes.result._value[0]._value._value._value[0]);
  }

async function start() {
  try {
    // Code that may potentially throw an error or exception
    console.log("Creating Buy Limit...")

    const buy_order_id = await measureExecutionTimeAsync(buy_limit)(
      settings.user1.address,
      String(10 * 10**7),
      settings.tokenB.id,
      settings.tokenA.id,
      String(1 * 10**7),
      "test001"
      );

    console.log("Buy order id:", buy_order_id);
  } catch (error) {
    // Code to handle the error or exception
    console.error("An error occurred:", error);
  }
}


start();
