import { Router } from 'express';
import bodyParser from 'body-parser';
import BlockchainController from './controller';
import Aave from "../../blockchain/aave";

export default function getBlockchainRouter(aave: Aave) {
    const router = Router();
    router.use(bodyParser.json());
    const controller = new BlockchainController(aave);

    router.get('/reserve/coin/:coin/',
        controller.getReserveInfo.bind(controller)
    );

    router.get('/reserve/user/:fromAddress/',
        controller.getUserReserveInfo.bind(controller)
    );

    router.get('/reserve/user/:fromAddress/coin/:coin/',
        controller.getUserReserveInfoForCoin.bind(controller)
    );

    router.post('/reserve/supply/coin/:coin/',
        controller.getUnsignedTxForSupply.bind(controller)
    );

    router.post('/reserve/withdraw/coin/:coin/',
        controller.getUnsignedTxForWithdraw.bind(controller)
    );

    router.post('/reserve/borrow/coin/:coin/',
        controller.getUnsignedTxForBorrow.bind(controller)
    );

    router.post('/reserve/repay/coin/:coin/',
        controller.getUnsignedTxForRepay.bind(controller)
    );

    router.post('/reserve/disable-collateral/coin/:coin/',
        controller.getUnsignedTxForDisableCollateral.bind(controller)
    );

    router.get('/erc20/allowance/user/:fromAddress/coin/:coin/',
        controller.getErc20Allowance.bind(controller)
    );

    router.post('/erc20/approve/coin/:coin/',
        controller.getErc20ApproveTx.bind(controller)
    );

    router.put('/broadcast/',
        controller.broadcastSignedTx.bind(controller)
    );

    return router;
}
