import { NextFunction, Request, Response } from "express";
import { ValidationChain } from "express-validator";

export type ValidatorArray = (ValidationChain | ((req: Request, res: Response<any>, next: NextFunction) => void))[];
