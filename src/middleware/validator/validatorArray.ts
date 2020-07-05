import { ValidationChain } from "express-validator";
import { Request, Response, NextFunction } from "express";

export type ValidatorArray = (ValidationChain | ((req: Request, res: Response<any>, next: NextFunction) => void))[];
