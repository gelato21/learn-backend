import { asyncHandler } from "../utils/AsyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnClodinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Jwt } from "jsonwebtoken";

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false});

        return {
            accessToken,
            refreshToken
        }

    } catch (error) {
        throw new ApiError(500, "Error occured while generating token");
    }
}


const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - (check for emtpy)
    // check if user already exists: through username, email
    // check for images, check for avtar(imp. which is required)
    // upload them to cloudinary, avtar
    // create user object - create entry in db
    // remove password and referesh token feild from response
    // check for user creation
    // return response

    const { fullName, username, email, password} = req.body;
    console.log(req.body);
    console.log(email);

    if(!fullName || !username || !email || !password){
        throw new ApiError(400, "Please provide all the details");
    }

    //Database se puch rhe h
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409, "User already exists");
    }

    //see in console log of req.body, req.files,
    console.log(req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path
    let coverImage = null
    if(req.files && req.files.coverImage){
        console.log(req.files.coverImage);
        coverImage = await uploadOnClodinary(coverImageLocalPath)
    }



    if(!avatarLocalPath){
        throw new ApiError(400, "Please provide avtar file");
    }

    const avatar = await uploadOnClodinary(avatarLocalPath)
    // const coverImage = await uploadOnClodinary(coverImageLocatPath)

    if(!avatar){
        throw new ApiError(500, "Error occured while uploading avtar file");
    }
    console.log(avatar); 

    const user = await User.create({
        fullName,
        username: username.toLowerCase(), 
        email, 
        password, 
        avatar : avatar.url, 
        coverImage: coverImage?.url || "",
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refershToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Error occured while creating user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser,  "User created successfully")
    )

})

const loginUser = asyncHandler(async (req, res) => { 
    // req.body->data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookies

    console.log(req.body)
    const {username, email, password} = req.body;

    if(!username &&  !email){
        throw new ApiError(400, "Please provide username or email");
    }

    if(!password){
        throw new ApiError(400, "Please provide password");
    }

    const user = await User.findOne({
        //mongoDB operator -> $or 
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User does not Exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401, "Password Incorrect");
    }


    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options) 
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {
            user: loggedInUser,
           accessToken, 
           refreshToken 
         },
        "User logged in successfully"
        )
    )

})

const logoutUser = asyncHandler(async (req, res) => {
    // remove cookies
    // send response

    await User.findByIdAndUpdate(req.user._id, 
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User logged out successfully")
    )   
})

const refreshAccessToken = asyncHandler(async (req, res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Please login first")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token")
        }
        if(user.refreshToken !== incomingRefreshToken){
            throw new ApiError(401, "Refresh Token is Expired or used")
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id);
    
        const options = {
            httpOnly: true,
            secure: true,
        }
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200, {
                accessToken,
                refreshToken: newRefreshToken
             },
            "Access token refreshed Successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token") 
    }

})

export { 
    registerUser,
    loginUser,
    logoutUser,  
    refreshAccessToken, 
 }