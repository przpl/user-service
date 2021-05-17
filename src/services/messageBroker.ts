import { EventEmitter } from "events";

import amqp from "amqplib";

import { Phone } from "../models/phone";

export class MessageBroker extends EventEmitter {
    private readonly EVENT = {
        USER_CREATED: "user.created",
        CODE_GENERATED: "code.Generated",
    };
    private readonly EXCHANGE = {
        USER: "user",
        CODE: "code",
    };

    private _channel: amqp.Channel;

    constructor(private _host: string, private _port: number, private _username: string, private _password: string) {
        super();

        if (!this._host) {
            throw new Error("Host is undefined.");
        }

        if (!this._port || this._port <= 0 || this._port > 65535) {
            throw new Error("Port is undefined or has invalid value.");
        }

        if (!this._username) {
            throw new Error("Username is undefined.");
        }

        if (!this._password) {
            throw new Error("Password is undefined.");
        }
    }

    public async connectAndSubscribe() {
        const connection = await amqp.connect({
            hostname: this._host,
            port: this._port,
            username: this._username,
            password: this._password,
        });
        this._channel = await connection.createChannel();

        this.createUserQueues();
        this.createCodeQueues();
    }

    public pushEmailCode(email: string, code: string, type: "confirmAccount" | "forgotPassword") {
        const dataObj = { email: email, code: code, category: "email", type: type };
        this.publish(this.EXCHANGE.CODE, this.EVENT.CODE_GENERATED, dataObj);
    }

    public pushPhoneCode(phone: Phone, code: string, type: "confirmAccount" | "forgotPassword") {
        const dataObj = { phone: phone, code: code, category: "phone", type: type };
        this.publish(this.EXCHANGE.CODE, this.EVENT.CODE_GENERATED, dataObj);
    }

    public publishNewUser(userData: object) {
        this.publish(this.EXCHANGE.USER, this.EVENT.USER_CREATED, userData);
    }

    private publish(exchange: string, routingKey: string, dataObj: object) {
        const buffer = Buffer.from(JSON.stringify(dataObj));
        this._channel.publish(exchange, routingKey, buffer, { persistent: true });
    }

    private async createUserQueues() {
        const exchange = this.EXCHANGE.USER;
        const createUserQueue = "user.createUser";
        await this._channel.assertQueue(createUserQueue, { durable: true });
        await this._channel.assertExchange(exchange, "direct", { durable: true });
        await this._channel.bindQueue(createUserQueue, exchange, this.EVENT.USER_CREATED);
    }

    private async createCodeQueues() {
        const exchange = this.EXCHANGE.CODE;
        const sendCodeQueue = "code.sendCode";
        await this._channel.assertQueue(sendCodeQueue, { durable: true });
        await this._channel.assertExchange(exchange, "direct", { durable: true });
        await this._channel.bindQueue(sendCodeQueue, exchange, this.EVENT.CODE_GENERATED);
    }
}
