import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cors from "cors";
import { createConnection, Connection } from "typeorm";

import Config from "./utils/config/config";
import UserRouter from "./routes/userRouter";
import UserController from "./controllers/userController";
import { handleNotFoundError, handleError } from "./utils/expressUtils";
import ServiceRouter from "./routes/serviceRouter";
import { UserManager } from "./managers/userManger";
import ServiceController from "./controllers/serviceController";
import { JwtService } from "./services/jwtService";
import Validator from "./middleware/validator";
import AuthMiddleware from "./middleware/authMiddleware";
import { CryptoService } from "./services/cryptoService";
import RecaptchaMiddleware from "./middleware/recaptchaMiddleware";
import { configurePassport } from "./middleware/passport";
import { TwoFaService } from "./services/twoFaService";
import { CacheDb } from "./dal/cacheDb";
import PasswordRouter from "./routes/passwordRouter";
import PasswordController from "./controllers/passwordController";
import EmailController from "./controllers/emailController";
import EmailRouter from "./routes/emailRouter";
import TokenController from "./controllers/tokenController";
import TokenRouter from "./routes/tokenRouter";
import ExternalUserController from "./controllers/externalUserController";
import ExternalUserRouter from "./routes/externalUserRouter";
import MfaController from "./controllers/mfaController";
import MfaRouter from "./routes/mfaRouter";

function loadConfig() {
    const envPath = `${__dirname}/.env`;
    const configPath = `${__dirname}/config.json`;
    const config = new Config();
    try {
        config.load(envPath, configPath);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }

    let atLeastOneError = false;
    const configValidationResult = config.validate();
    if (configValidationResult.length > 0) {
        for (const result of configValidationResult) {
            if (result.severity === "error") {
                atLeastOneError = true;
                console.error(`\x1b[31mConfig validation error: ${result.variableName} - ${result.message}`);
            } else {
                console.warn(`\x1b[33mConfig validation warning: ${result.variableName} - ${result.message}`);
            }
        }
        if (atLeastOneError) {
            process.exit(1);
        }
    }

    return config;
}

async function connectToDb() {
    let conn: Connection;
    try {
        conn = await createConnection();
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
    return conn;
}

async function start() {
    const config = loadConfig();
    const dbConnection = await connectToDb();

    const app = express();
    if (config.isDev()) {
        app.use(morgan("dev"));
    }
    if (config.isCorsEnabled()) {
        app.use(cors());
    }
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.set("trust proxy", true);
    configurePassport(app, config.jsonConfig);

    const cacheDb = new CacheDb(config.jsonConfig.redis.host, config.jsonConfig.redis.port);
    const jwtService = new JwtService(config.jwtPrivateKey, config.tokenTTLMinutes);
    const cryptoService = new CryptoService(config.jsonConfig.security.bcryptRounds);
    const twoFaService = new TwoFaService(cacheDb, cryptoService);

    const validator = new Validator(config.jsonConfig);
    const authMiddleware = new AuthMiddleware(jwtService);
    const captchaMiddleware = new RecaptchaMiddleware(
        config.jsonConfig.security.reCaptcha.enabled,
        config.recaptchaSiteKey,
        config.recaptchaSecretKey,
        config.jsonConfig.security.reCaptcha.ssl
    );

    const userManager = new UserManager(cryptoService, config.emailSigKey, config.jsonConfig.passwordReset.codeExpirationTimeInMinutes);

    const serviceController = new ServiceController(config);
    const userController = new UserController(userManager, jwtService, twoFaService);
    const passwordCtrl = new PasswordController(userManager);
    const emailCtrl = new EmailController(userManager);
    const tokenCtrl = new TokenController(jwtService);
    const externalUserCtrl = new ExternalUserController(userManager, jwtService);
    const mfaCtrl = new MfaController(userManager, twoFaService, config.jsonConfig.security.twoFaToken.appName);

    app.use("/api/service", ServiceRouter.getExpressRouter(serviceController));
    app.use("/api/user", UserRouter.getExpressRouter(userController, validator, captchaMiddleware, config.jsonConfig));
    app.use("/api/user/password", PasswordRouter.getExpressRouter(passwordCtrl, authMiddleware, validator, captchaMiddleware, config.jsonConfig));
    app.use("/api/user/email", EmailRouter.getExpressRouter(emailCtrl, validator, captchaMiddleware, config.jsonConfig));
    app.use("/api/user/token", TokenRouter.getExpressRouter(tokenCtrl, validator));
    app.use("/api/user/external-login", ExternalUserRouter.getExpressRouter(externalUserCtrl, authMiddleware, validator, config.jsonConfig));
    app.use("/api/user/mfa", MfaRouter.getExpressRouter(mfaCtrl, authMiddleware, validator, config.jsonConfig));

    app.use((req, res, next) => handleNotFoundError(res));
    app.use((err: any, req: Request, res: Response, next: NextFunction) => handleError(err, res, config.isDev()));

    app.listen(config.port, () => {
        console.log(`App is running at http://localhost:${config.port} in ${app.get("env")} mode`);
    })
        .on("error", async e => {
            console.log(`Cannot run app: ${e.message}`);
            await dbConnection.close();
            process.exit(1);
        })
        .on("close", async () => {
            await dbConnection.close();
        });
}

start();
