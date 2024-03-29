// this will veryify only is that is user are there not

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {

    const token = req.cookies?.accessToken || req.headers("Authorization")?.replace("Bearer", "")
    if (!token) {
      throw new ApiError(401, "Unauthorized")
    }
  
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
  
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
  
    if(!user){
      //TODO: discuss about front-end
      throw new ApiError(401, "Invalid Access Token")
    }
  
    req.user = user;
  
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token")
  }
});
