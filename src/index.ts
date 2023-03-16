import express, { Express, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import http from "http";
import config from "./config/config.js";
import Logging from "./library/logging.js";
import authRouter from "./routes/auther.routes.js";
import decodeAuthToken from "./middleware/decodeAuthToken.js";
import { IUser } from "./types/user.type.js";

const router: Express = express();
const allowedOrigins = ["*"];

const connectDatabase = () => {
    mongoose.set("strictQuery", false);
    mongoose
        .connect(config.dataBase.MONGO_URL, {
            retryWrites: true,
            w: "majority",
        })
        .then(() => {
            Logging.info("Connected to MongoDB");
            initServer(router);
        })
        .catch((err) => {
            Logging.error(`Error connecting to MongoDB: \n ${err}`);

            setTimeout(() => {
                Logging.warning("Reconnecting to MongoDB");
                connectDatabase();
            }, 3000);
        });
};
connectDatabase();

const initServer = (router: Express) => {
    router.use(express.json());
    router.use(express.urlencoded({ extended: true }));
    router.use((req, res, next) => {
        Logging.event(`${req.method} [${req.originalUrl}] [${req.ip}]`);
        Logging.info(req.body);

        res.header("Access-Control-Allow-Origin", allowedOrigins);
        res.header(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, PATCH, DELETE"
        );
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, X-Requested-With, Content-Type, Accept, Authorization"
        );
        next();
    });

    // auth routes : create, login, update, delete user, getOne, getAll
    router.use("/auth", authRouter);

    // example route to check token based access
    router.get("/video", decodeAuthToken, (req: Request, res: Response) => {
        const user = req.body.user as IUser;
        if (user.role !== "student") res.status(401).send("Unauthorized");
        else {
            Logging.event(`User ${user.name} is watching video`);
            res.send("Hello World video");
        }
    });

    // TODO: a way to handle unavailable routes

    http.createServer(router).listen(config.server.SERVER_PORT, () => {
        Logging.log(`Server started at port ${config.server.SERVER_PORT}`);
    });
};
