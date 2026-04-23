const { Keypair, Networks, Operation, TransactionBuilder, rpc, xdr, Address, BASE_FEE } = require('./stellar_deploy/node_modules/@stellar/stellar-sdk');
const fs = require('fs');
const crypto = require('crypto');

async function main() {
    console.log("Setting up testnet deployment...");
    const server = new rpc.Server("https://soroban-testnet.stellar.org");
    const networkPassphrase = Networks.TESTNET;
    
    const keypair = Keypair.random();
    console.log("Generated Keypair:", keypair.publicKey());
    
    console.log("Funding account via Friendbot...");
    const response = await fetch(`https://friendbot.stellar.org?addr=${keypair.publicKey()}`);
    await response.json();
    console.log("Account funded.");
    
    let account = await server.getAccount(keypair.publicKey());
    
    const wasm = fs.readFileSync('./target/wasm32-unknown-unknown/release/messaging_contract.wasm');
    
    console.log("Uploading WASM...");
    let tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
        .addOperation(Operation.invokeHostFunction({
            func: xdr.HostFunction.hostFunctionTypeUploadContractWasm(wasm),
            auth: []
        }))
        .setTimeout(30)
        .build();
    
    let preparedTx = await server.prepareTransaction(tx);
    preparedTx.sign(keypair);
    
    let sendResult = await server.sendTransaction(preparedTx);
    let txHash = sendResult.hash;
    
    let wasmId;
    while (true) {
        let status = await server.getTransaction(txHash);
        if (status.status === "SUCCESS") {
            const resultValue = status.resultMetaXdr.v3().sorobanMeta().returnValue();
            wasmId = resultValue.bytes();
            console.log("WASM Uploaded successfully. ID:", wasmId.toString('hex'));
            break;
        } else if (status.status === "FAILED") {
            console.error("WASM Upload Failed", status);
            return;
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log("Creating Contract...");
    account = await server.getAccount(keypair.publicKey());
    const salt = crypto.randomBytes(32);
    
    const preimage = xdr.ContractIdPreimage.contractIdPreimageFromAddress(
        new xdr.ContractIdPreimageFromAddress({
            address: Address.fromString(keypair.publicKey()).toScAddress(),
            salt: salt
        })
    );
    
    tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
        .addOperation(Operation.invokeHostFunction({
            func: xdr.HostFunction.hostFunctionTypeCreateContract(
                new xdr.CreateContractArgs({
                    contractIdPreimage: preimage,
                    executable: xdr.ContractExecutable.contractExecutableWasm(wasmId)
                })
            ),
            auth: []
        }))
        .setTimeout(30)
        .build();
        
    preparedTx = await server.prepareTransaction(tx);
    preparedTx.sign(keypair);
    
    sendResult = await server.sendTransaction(preparedTx);
    txHash = sendResult.hash;
    
    while (true) {
        let status = await server.getTransaction(txHash);
        if (status.status === "SUCCESS") {
            const resultValue = status.resultMetaXdr.v3().sorobanMeta().returnValue();
            const contractAddress = Address.fromScAddress(resultValue.address()).toString();
            console.log("\n=================================");
            console.log("CONTRACT DEPLOYED SUCCESSFULLY!");
            console.log("CONTRACT ID:", contractAddress);
            console.log("=================================\n");
            break;
        } else if (status.status === "FAILED") {
            console.error("Contract Creation Failed", status);
            return;
        }
        await new Promise(r => setTimeout(r, 1000));
    }
}

main().catch(console.error);
