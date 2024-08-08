import BigNumber from 'bignumber.js';
import {ethers} from 'ethers';
import {UiPoolDataProvider, ChainId, Pool} from '@aave/contract-helpers';
import {
    getMarketForNetworkAndChain,
    getTxDetailsFromExtendedTx,
    rayToDecimalString,
    SupportedMarketType
} from './aave-helpers';
import {fromMajorUnitToMinorUnit, fromMinorUnitToMajorUnit, getCoinContractAddress, NetworkTypes} from "./constants";

export default class Aave {
    poolDataProviderContract: UiPoolDataProvider;
    networkType: NetworkTypes;
    chainId: ChainId;
    provider: ethers.providers.JsonRpcProvider;
    market: SupportedMarketType;

    constructor(providerUrl: string, networkType: NetworkTypes, chainId: ChainId) {
        this.networkType = networkType
        this.chainId = chainId
        this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
        this.market = getMarketForNetworkAndChain(networkType, chainId);
        this.poolDataProviderContract = new UiPoolDataProvider({
            uiPoolDataProviderAddress: this.market.UI_POOL_DATA_PROVIDER,
            provider: this.provider,
            chainId,
        });
    }

    async getCoinReserveData(coin: string) {
        const contractAddress = getCoinContractAddress(coin, this.chainId, this.networkType);
        if (!contractAddress) {
            throw new Error(`contract address not found for coin(${coin})`)
        }
        const reserves = await this.poolDataProviderContract.getReservesHumanized({
            lendingPoolAddressProvider: this.market.POOL_ADDRESSES_PROVIDER,
        });

        const coinReserves = reserves
            .reservesData
            .filter(reserve => reserve.underlyingAsset?.toLowerCase() === contractAddress?.toLowerCase())

        if (coinReserves.length > 1) {
            throw new Error('multiple reserves for same underlying currency not supported yet')
        }
        const reserve = coinReserves[0];
        const apy = rayToDecimalString(reserve.liquidityRate);
        return {
            apy,
            tokenAddress: reserve.underlyingAsset,
            supply: fromMinorUnitToMajorUnit(reserve.availableLiquidity, coin).toFixed(),
            enabled: reserve.borrowingEnabled && reserve.isActive && !reserve.isFrozen && !reserve.isPaused,
            reserveAddress: reserve.aTokenAddress,
            raw: reserve
        }
    }

    async getUserBalances(coin: string, fromAddress: string) {
        const contractAddress = getCoinContractAddress(coin, this.chainId, this.networkType);
        if (!contractAddress) {
            throw new Error(`contract address not found for coin(${coin})`)
        }
        const userReserves = await this.poolDataProviderContract.getUserReservesHumanized({
            lendingPoolAddressProvider: this.market.POOL_ADDRESSES_PROVIDER,
            user: fromAddress,
        });

        const coinReserves = userReserves.userReserves
            .filter(reserve => reserve.underlyingAsset?.toLowerCase() === contractAddress?.toLowerCase())

        return Promise.all(coinReserves.map(async reserve => {
            const aTokenBalance = reserve.scaledATokenBalance;
            const currentBalance = await this.getUnderlyingTokenBalance(aTokenBalance, coin);
            return {
                currentBalance: currentBalance,
                raw: reserve
            };
        }))
    }

    async getUnsignedTxForSupply(coin: string, user: string, amount: string) {
        const contractAddress = getCoinContractAddress(coin, this.chainId, this.networkType);
        if (!contractAddress) {
            throw new Error(`contract address not found for coin(${coin})`)
        }

        await this.hasSufficientAllowance(coin, user, amount);

        const reserve = await this.getCoinReserveData(coin);
        const pool = new Pool(this.provider, {POOL: this.market.POOL});
        /*
        - @param `user` The ethereum address that will make the deposit
        - @param `reserve` The ethereum address of the underlying asset
        - @param `amount` The amount to be deposited
        */
        const txs = await pool.supply({
            user,
            amount: fromMinorUnitToMajorUnit(amount, coin).toString(),
            reserve: reserve.tokenAddress,
        });

        if (txs.length > 1) {
            throw new Error(`should have only received 1 actionable tx from pool.withdraw. got ${txs.length}`);
        }

        try {
            return getTxDetailsFromExtendedTx(user, this.provider, txs[0]);
        } catch (e) {
            throw new Error((e as Error).message)
        }
    }

    async getUnsignedTxForWithdraw(coin: string, user: string, amount: string) {
        const contractAddress = getCoinContractAddress(coin, this.chainId, this.networkType);
        if (!contractAddress) {
            throw new Error(`contract address not found for coin(${coin})`)
        }
        const reserve = await this.getCoinReserveData(coin);
        const pool = new Pool(this.provider, {POOL: this.market.POOL});
        const userReserves = await this.getUserBalances(coin, user);
        if (userReserves.length > 1) {
            throw new Error(`only support withdrawing from 1 reserve. for ${userReserves.length} for coin(${coin})`)
        }
        /*
        - @param `user` The ethereum address that will make the deposit
        - @param `reserve` The ethereum address of the underlying asset
        - @param `amount` The amount to be withdrawn
        */
        const availableAmount = fromMinorUnitToMajorUnit(userReserves[0].currentBalance, coin).toString();
        const amountToWithdraw = fromMinorUnitToMajorUnit(amount, coin).toString();
        if (new BigNumber(amount).gt(userReserves[0].currentBalance)) {
            throw new Error(`currenBalance(${availableAmount}) not sufficient to withdraw given amount(${amountToWithdraw})`)
        }
        const txs = await pool.withdraw({
            user,
            amount: amountToWithdraw,
            reserve: reserve.tokenAddress,
            aTokenAddress: reserve.raw.aTokenAddress,
        });

        if (txs.length > 1) {
            throw new Error(`should have only received 1 actionable tx from pool.withdraw. got ${txs.length}`);
        }

        try {
            return getTxDetailsFromExtendedTx(user, this.provider, txs[0]);
        } catch (e) {
            throw new Error((e as Error).message)
        }
    }

    async getUnsignedTxForDisableCollateral(coin: string, user: string) {
        const contractAddress = getCoinContractAddress(coin, this.chainId, this.networkType);
        if (!contractAddress) {
            throw new Error(`contract address not found for coin(${coin})`)
        }
        const reserve = await this.getCoinReserveData(coin);
        const pool = new Pool(this.provider, {POOL: this.market.POOL});
        const userReserves = await this.getUserBalances(coin, user);
        if (userReserves.length > 1) {
            throw new Error(`only support changing collateral status for 1 reserve, got ${userReserves.length}`)
        }
        const txs = await pool.setUsageAsCollateral({
            user,
            reserve: reserve.tokenAddress,
            usageAsCollateral: false
        });

        if (txs.length > 1) {
            throw new Error(`should have only received 1 actionable tx from pool.setUsageAsCollateral. got ${txs.length}`);
        }

        try {
            return getTxDetailsFromExtendedTx(user, this.provider, txs[0]);
        } catch (e) {
            throw new Error((e as Error).message)
        }
    }

    async getErc20ApprovalTransaction(coin: string, user: string, amount: string) {
        const contractAddress = getCoinContractAddress(coin, this.chainId, this.networkType);
        if (!contractAddress) {
            throw new Error(`contract address not found for coin(${coin})`)
        }
        const pool = new Pool(this.provider, {POOL: this.market.POOL});

        const approveTx = pool.erc20Service.approve({
            user,
            token: contractAddress,
            spender: this.market.POOL,
            amount: amount,
        });

        return getTxDetailsFromExtendedTx(user, this.provider, approveTx)
    }

    async getErc20Allowance(coin: string, user: string) {
        const contractAddress = getCoinContractAddress(coin, this.chainId, this.networkType);
        if (!contractAddress) {
            throw new Error(`contract address not found for coin(${coin})`)
        }
        const pool = new Pool(this.provider, {POOL: this.market.POOL});

        const allowanceLeft = await pool.erc20Service.approvedAmount({
            user,
            token: contractAddress,
            spender: this.market.POOL,
        });

        return fromMajorUnitToMinorUnit(allowanceLeft.toString(), coin).toString();
    }

    private async getUnderlyingTokenBalance(aTokenBalance: string, coin: string) {
        const reserveData = await this.getCoinReserveData(coin);
        const index = reserveData.raw.liquidityIndex
        return rayToDecimalString(new BigNumber(index).multipliedBy(aTokenBalance).toFixed(0)).split('.')[0]
    }

    private async hasSufficientAllowance(coin: string, user: string, amount: string) {
        const allowanceRemaining = await this.getErc20Allowance(coin, user);
        if (new BigNumber(allowanceRemaining).lt(amount)) {
            throw new Error(`allowance(${fromMinorUnitToMajorUnit(allowanceRemaining, coin).toString()}) is not sufficient for supply transaction for amount(${fromMinorUnitToMajorUnit(amount, coin).toString()})`)
        }
    }
}