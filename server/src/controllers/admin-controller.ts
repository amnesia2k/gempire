import { Request, RequestHandler, Response } from "express";

export const accessDashboard = async (req: Request, res: Response) => {
  res.status(200).json({
    message: "Access granted to the admin dashboard",
  });
};
