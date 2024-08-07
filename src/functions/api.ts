import express, { Router } from "express";
import serverless, { Application } from "serverless-http";

const api = express();

const router = Router();
router.get("/hello", (req, res) => res.send("Hello World!"));

router.get('/*', (req, res, next) => {
    res.json({path: req.path});
    next()
})

api.use('/functions/api',
    (req, res, next) => {
        console.log({ path: req.path})
        next()
    },
    router
); // Path must match the redirect in netlify.toml

export const handler = serverless(api as Application);