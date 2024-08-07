import express, { Router } from "express";
import serverless, { Application } from "serverless-http";

const api = express();

const router = Router();
router.get("/hello", (req, res) => res.send("Hello World!"));

api.use('/.netlify/functions/api', router); // Path must match the redirect in netlify.toml

export const handler = serverless(api as Application);