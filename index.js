require('dotenv').config()
const Web3 = require('web3')
const BN = require('bn.js')

//WEB3 Config
const web3 = new Web3(process.env.RPC_URL)
const wallet = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY)

//SMART CONTRACT ABIs
const MASTERGARDENER_ABI = require("./abis/MasterGardener.json")
const UNISWAP_ROUTER_ABI = require("./abis/UniswapV2Router.json")
const WRAPPED_ONE_ABI = require("./abis/WrappedOne.json")

//smart contract objects
const masterGardenerContract = new web3.eth.Contract(MASTERGARDENER_ABI, process.env.MASTERGARDENER_CONTRACT)

// The minimum ABI to get ERC20 Token balance
let minABI = [
    // balanceOf
    {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "payable": false,
        "type": "function"
    },
    // decimals
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "name": "", "type": "uint8" }],
        "type": "function"
    }
];

let tokenContract = new web3.eth.Contract(minABI, process.env.JEWEL_TOKEN_ADDRESS);
let uniswapContract = new web3.eth.Contract(UNISWAP_ROUTER_ABI, process.env.UNISWAP_FACTORY_ADDRESS)
let wrappedOneContract = new web3.eth.Contract(WRAPPED_ONE_ABI, process.env.WONE_TOKEN_ADDRESS)

//Get balance
async function getBalance() {
    const balance = await tokenContract.methods.balanceOf(process.env.WALLET_ADDRESS).call();
    return web3.utils.fromWei(balance, 'ether') 
}

async function swapTokens(amount, from, to) {
    const gasLimit = (await web3.eth.getBlock('latest')).gasLimit
    const gasPrice = new BN(await web3.eth.getGasPrice()).mul(new BN(1))
    const slippage = 0.005
    const expiry = Math.round(Date.now() / 1000) + (60 * 20)

    const amountToSwap = web3.utils.toWei(String(amount), 'ether')
    const amountOutTx = await uniswapContract.methods.getAmountsOut(amountToSwap, [from, to]).call()
    const amountOutMin = parseFloat(web3.utils.fromWei(amountOutTx[1])) * (1 - slippage)

    if (from == process.env.WONE_TOKEN_ADDRESS) {
        await wrapOne(amount)
    }

    const swap = uniswapContract.methods.swapExactETHForTokens(web3.utils.toWei(amountOutMin.toString()), [from, to], wallet.address, expiry).send({
        value: String(amountToSwap),
        from: wallet.address,
        gas: gasLimit,
        gasPrice: gasPrice
    }).then(_ => {
        console.log('Swapped successfully!')
    }).catch((error) => {
        console.log('Error trying to swap tokens: ' + JSON.stringify(error))
    })
}

async function addLiquidity(amount, baseToken, altToken) {
    const gasLimit = (await web3.eth.getBlock('latest')).gasLimit
    const gasPrice = new BN(await web3.eth.getGasPrice()).mul(new BN(1))
    const slippage = 0.005
    const expiry = Math.round(Date.now() / 1000) + 60

    const amountToSwap = web3.utils.toWei(String(amount))
    const amountOutTx = await uniswapContract.methods.getAmountsOut(amountToSwap, [baseToken, altToken]).call()
    const amountOutMin = parseFloat(web3.utils.fromWei(amountOutTx[1])) 

    await wrapOne(amountOutMin)

    await uniswapContract.methods.addLiquidityETH(baseToken, 
        web3.utils.toWei(String(amount)), 
        web3.utils.toWei(String(amount * (1 - slippage))),
        web3.utils.toWei(String(amountOutMin * (1 - slippage))),
        wallet.address,
        expiry)
    .send({
        value: web3.utils.toWei(String(amountOutMin)), 
        from: wallet.address,
        gas: gasLimit,
        gasPrice: gasPrice
    }).then((test1, test2, test3) => {
        console.log('Added liquidity successfully! ', test1, test2, test3)
    }).catch((error) => {
        console.log('Error trying to add liquidity: ' + JSON.stringify(error))
    })
}

let currently_compounding = false

async function claimRewards() {
    const gasLimit = (await web3.eth.getBlock('latest')).gasLimit
    const gasPrice = new BN(await web3.eth.getGasPrice()).mul(new BN(1))

    await masterGardenerContract.methods.claimReward(process.env.FARM_PID).send({
        from: wallet.address,
        gas: gasLimit,
        gasPrice: gasPrice
    }).then(_ => {
        console.log('Rewards claimed successfully!')
    }).catch(error => {
        console.log('Error trying to claim rewards: ' + JSON.stringify(error))
    })
}

async function wrapOne(amount) {
    const gasLimit = (await web3.eth.getBlock('latest')).gasLimit
    const gasPrice = new BN(await web3.eth.getGasPrice()).mul(new BN(1))
    
    await wrappedOneContract.methods.deposit().send({
        value: web3.utils.toWei(String(amount)),
        from: wallet.address,
        gas: gasLimit,
        gasPrice: gasPrice
    })
}

async function unwrapOne(amount) {
    const gasLimit = (await web3.eth.getBlock('latest')).gasLimit
    const gasPrice = new BN(await web3.eth.getGasPrice()).mul(new BN(1))
    
    await wrappedOneContract.methods.withdraw().send({
        value: web3.utils.toWei(String(amount)),
        from: wallet.address,
        gas: gasLimit,
        gasPrice: gasPrice
    })
}

// addLiquidity(0.005, process.env.JEWEL_TOKEN_ADDRESS, process.env.WONE_TOKEN_ADDRESS)

// depositWrappedOne()

// getBalance().then(balance => {
//     console.log('Balance: ', balance)
//     console.log(web3.utils.toWei(balance, 'ether'))
// })

// web3.eth.getTransactionCount(wallet.address, 'pending').then(count => {
//     console.log(count)

// })
swapTokens(1, process.env.WONE_TOKEN_ADDRESS, process.env.JEWEL_TOKEN_ADDRESS)

// async function compound(amountOswap){
//     if(currently_compounding) return
//     let ts = Date.now();
//     let date_ob = new Date(ts);
//     let seconds = date_ob.getSeconds();
//     let minutes = date_ob.getMinutes();
//     let hours = date_ob.getHours();

//     console.log(`\nRun Compounding Cycle\nCurrent Time: ` + hours + ":" + minutes + ":" + seconds)
//     try{
        
//         const gasLimit = 200000 //(await web3.eth.getBlock('latest')).gasLimit
//         const gasPrice = new BN(await web3.eth.getGasPrice()).mul(new BN(1))
//         const txCost = web3.utils.fromWei(gasPrice.toString(),'ether') * gasLimit
//         const claimRewards = await masterGardenerContract.methods.claimRewards(process.env.FARM_PID).send({
//             from: wallet.address,
//             gas: gasLimit,
//             gasPrice: gasPrice
//         }).then(_ => {
//             console.log('Rewards claimed successfully!')
//         })

//         const depositTx = await oswapMasterChefContract.methods.deposit(process.env.FARM_PID,amountOswap).send(
//             {
//             from: wallet.address,
//             gas: gasLimit,
//             gasPrice: gasPrice
//             }
//         )
//         console.log(`Deposit Completed: ${depositTx.status}\n`)
//         console.log(`Next run in ${process.env.CYCLE_TIME/60000} Minutes.\n`)
//     } catch (err){
//         currently_compounding = false
//         console.log(`Deposit OSWAP Error: ${err.message}\n`)
//         return
//     }
// }

// claimRewards()

// getBalance().then(function (result) {

//     compound(result)
// /*
//       const gasLimit = 200000
//       const gasPrice = web3.eth.getGasPrice()
//       const txCost = web3.utils.fromWei(gasPrice.toString(),'ether') * gasLimit
//       const depositTx = dinoExtinctionContract.methods.transact(result).send(
//             {
//             from: wallet.address,
//             gas: gasLimit,
//             gasPrice: gasPrice
//             }
//         )
//         console.log(`deposit status: ${depositTx.status}`);
//         */
//         // resultRound = result * 0.000000000000000001
//         // console.log(`Pending oSwap to deposit ${resultRound.toFixed(8)}`)
// });

// const POLLING_INTERVAL = process.env.CYCLE_TIME // 10 minutes 
// setInterval(async () => { await getBalance().then(function (result) {

// compound(result)
// /*
//       const gasLimit = 200000
//       const gasPrice = web3.eth.getGasPrice()
//       const txCost = web3.utils.fromWei(gasPrice.toString(),'ether') * gasLimit
//       const depositTx = dinoExtinctionContract.methods.transact(result).send(
//             {
//             from: wallet.address,
//             gas: gasLimit,
//             gasPrice: gasPrice
//             }
//         )
//         console.log(`deposit status: ${depositTx.status}`);
//         */
//         resultRound = result * 0.000000000000000001
//         console.log(`Pending oSwap to deposit ${resultRound.toFixed(8)}`)
// });}, POLLING_INTERVAL)


