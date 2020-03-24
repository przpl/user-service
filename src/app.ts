import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createConnection, Connection } from "typeorm";

import Config from "./utils/config/config";
import LocalUserRouter from "./routes/user/localUserRouter";
import LocalUserController from "./controllers/user/localUserController";
import { handleNotFoundError, handleError } from "./utils/expressUtils";
import ServiceRouter from "./routes/serviceRouter";
import { UserManager } from "./managers/userManger";
import ServiceController from "./controllers/serviceController";
import { JwtService } from "./services/jwtService";
import Validator from "./middleware/validator/validator";
import AuthMiddleware from "./middleware/authMiddleware";
import { CryptoService } from "./services/cryptoService";
import RecaptchaMiddleware from "./middleware/recaptchaMiddleware";
import { configurePassport } from "./middleware/passport";
import { MfaService } from "./services/mfaService";
import { CacheDb } from "./dal/cacheDb";
import PasswordRouter from "./routes/passwordRouter";
import PasswordController from "./controllers/passwordController";
import EmailController from "./controllers/emailController";
import EmailRouter from "./routes/emailRouter";
import TokenController from "./controllers/tokenController";
import TokenRouter from "./routes/tokenRouter";
import ExternalUserController from "./controllers/user/externalUserController";
import ExternalUserRouter from "./routes/user/externalUserRouter";
import MfaController from "./controllers/mfaController";
import MfaRouter from "./routes/mfaRouter";
import { SessionManager } from "./managers/sessionManager";
import { TimeSpan } from "./utils/timeSpan";
import { QueueService } from "./services/queueService";
import { EmailManager } from "./managers/emailManager";
import { RoleManager } from "./managers/roleManager";
import InternalRouter from "./routes/internalRouter";
import InternalAuthMiddleware from "./middleware/internalAuthMiddleware";
import InternalController from "./controllers/internalController";

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
    const jsonConfig = config.jsonConfig;
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
    app.use(cookieParser());
    app.set("trust proxy", true);
    configurePassport(app, jsonConfig);

    const cacheDb = new CacheDb(jsonConfig.redis.host, jsonConfig.redis.port);
    const jwtService = new JwtService(config.jwtPrivateKey, TimeSpan.fromMinutes(config.tokenTTLMinutes));
    const cryptoService = new CryptoService(jsonConfig.security.bcryptRounds);
    const mfaService = new MfaService(cacheDb, cryptoService, TimeSpan.fromSeconds(jsonConfig.security.mfa.loginTokenTTLSeconds));
    const queueService = new QueueService();

    const validator = new Validator(jsonConfig);
    const authMiddleware = new AuthMiddleware(cacheDb, jwtService);
    const captchaMiddleware = new RecaptchaMiddleware(
        jsonConfig.security.reCaptcha.enabled,
        config.recaptchaSiteKey,
        config.recaptchaSecretKey,
        jsonConfig.security.reCaptcha.ssl
    );
    const internalAuthMiddleware = new InternalAuthMiddleware(config.masterKey);

    const userManager = new UserManager(cryptoService, TimeSpan.fromMinutes(jsonConfig.passwordReset.codeTTLMinutes), jsonConfig);
    const sessionManager = new SessionManager(cryptoService, jwtService, cacheDb, jsonConfig, TimeSpan.fromMinutes(config.tokenTTLMinutes));
    const emailManager = new EmailManager(
        cryptoService,
        jsonConfig.localLogin.email.resendLimit,
        TimeSpan.fromSeconds(jsonConfig.localLogin.email.resendTimeLimitSeconds)
    );
    const roleManager = new RoleManager();

    const serviceCtrl = new ServiceController(config);
    const internalCtrl = new InternalController(roleManager, sessionManager);
    const localUserCtrl = new LocalUserController(userManager, sessionManager, roleManager, emailManager, queueService, jwtService, mfaService);
    const externalUserCtrl = new ExternalUserController(userManager, sessionManager, roleManager, queueService, jwtService);
    const passwordCtrl = new PasswordController(userManager);
    const emailCtrl = new EmailController(emailManager, queueService);
    const tokenCtrl = new TokenController(roleManager, sessionManager, jwtService);
    const mfaCtrl = new MfaController(userManager, mfaService, jsonConfig);

    app.use("/api/service", ServiceRouter.getExpressRouter(serviceCtrl));
    app.use("/api/internal", InternalRouter.getExpressRouter(internalCtrl, internalAuthMiddleware));
    app.use("/api/user", LocalUserRouter.getExpressRouter(localUserCtrl, validator, captchaMiddleware, jsonConfig));
    app.use("/api/user/external", ExternalUserRouter.getExpressRouter(externalUserCtrl, authMiddleware, validator, jsonConfig));
    app.use("/api/user/password", PasswordRouter.getExpressRouter(passwordCtrl, authMiddleware, validator, captchaMiddleware, jsonConfig));
    app.use("/api/user/email", EmailRouter.getExpressRouter(emailCtrl, validator, captchaMiddleware, jsonConfig));
    app.use("/api/user/token", TokenRouter.getExpressRouter(tokenCtrl, validator));
    app.use("/api/user/mfa", MfaRouter.getExpressRouter(mfaCtrl, authMiddleware, validator, jsonConfig));

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
