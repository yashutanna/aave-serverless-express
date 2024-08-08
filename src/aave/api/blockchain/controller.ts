import type {Request, Response} from 'express';
import Aave from '../../blockchain/aave';

export default class BlockchainController {
    private readonly aave: Aave;

    constructor(aave: Aave) {
        this.aave = aave;
    }

    async getReserveInfo(req: Request, res: Response) {
        const { coin } = req.params;
        const reserveInfo = await this.aave.getCoinReserveData(coin)
        res.status(200).json(reserveInfo);
    }

    async getUserReserveInfo(req: Request, res: Response) {
        const { fromAddress } = req.params;
        const reserveInfo = await this.aave.getUserBalances(fromAddress)
        res.status(200).json(reserveInfo);
    }

    async getUserReserveInfoForCoin(req: Request, res: Response) {
        const { coin, fromAddress } = req.params;
        const reserveInfo = await this.aave.getUserCoinBalances(coin, fromAddress)
        res.status(200).json(reserveInfo);
    }

    async getErc20ApproveTx(req: Request, res: Response) {
        const { coin } = req.params;
        const { fromAddress, amount } = req.body;
        const approvalTx = await this.aave.getErc20ApprovalTransaction(coin, fromAddress, amount)
        res.status(200).json(approvalTx);
    }
    async getErc20Allowance(req: Request, res: Response) {
        const { coin, fromAddress } = req.params;
        const remainingAllowance = await this.aave.getErc20Allowance(coin, fromAddress)
        res.status(200).json({ remainingAllowance });
    }

    async getUnsignedTxForSupply(req: Request, res: Response) {
        const { coin } = req.params;
        const { fromAddress, amount } = req.body;
        const unsignedSupplyTx = await this.aave.getUnsignedTxForSupply(coin, fromAddress, amount)
        res.status(200).json(unsignedSupplyTx);
    }
    async getUnsignedTxForWithdraw(req: Request, res: Response) {
        const { coin } = req.params;
        const { fromAddress, amount } = req.body;
        const unsignedSupplyTx = await this.aave.getUnsignedTxForWithdraw(coin, fromAddress, amount)
        res.status(200).json(unsignedSupplyTx);
    }
    async getUnsignedTxForBorrow(req: Request, res: Response) {
        const { coin } = req.params;
        const { fromAddress, amount } = req.body;
        const unsignedBorrowTx = await this.aave.getUnsignedTxForBorrow(coin, fromAddress, amount)
        res.status(200).json(unsignedBorrowTx);
    }
    async getUnsignedTxForRepay(req: Request, res: Response) {
        const { coin } = req.params;
        const { fromAddress, amount } = req.body;
        const unsignedRepayTx = await this.aave.getUnsignedTxForRepay(coin, fromAddress, amount)
        res.status(200).json(unsignedRepayTx);
    }
    async getUnsignedTxForDisableCollateral(req: Request, res: Response) {
        const { coin } = req.params;
        const { fromAddress } = req.body;
        const unsignedDisableCollateralTx = await this.aave.getUnsignedTxForDisableCollateral(coin, fromAddress)
        res.status(200).json(unsignedDisableCollateralTx);
    }
    async broadcastSignedTx(req: Request, res: Response) {
        const { signedTx } = req.body;
        const broadcastResponse = await this.aave.broadcastSignedTx(signedTx)
        res.status(200).json(broadcastResponse);
    }
}
