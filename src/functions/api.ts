import express from "express";
import serverless, { Application } from "serverless-http";
import getBlockchainRouter from "../aave/api/blockchain/router";
import Aave from "../aave/blockchain/aave";
import {getNetworkTypeFromChain} from "../aave/blockchain/constants";

const chainId = Number(process.env.CHAIN_ID as string);
const networkType = getNetworkTypeFromChain(chainId);
const aave = new Aave(process.env.NODE_HTTP_URL as string, networkType, chainId)

const api = express();

const router = getBlockchainRouter(aave);

api.use("/api/aave", router);

export const handler = serverless(api as Application);