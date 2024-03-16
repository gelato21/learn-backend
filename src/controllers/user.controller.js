import { asyncHandler } from "../utils/AsyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/User.js";
import {uploadOnClodinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
    const existedUser = User.findOne({
        $or: [{username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409, "User already exists");
    }

    //see in console log of req.body, req.files,
    const avatarLocalPath = req.files?.avtar[0]?.path
    const coverImageLocatPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Please provide avtar file");
    }

    const avatar = await uploadOnClodinary(avatarLocalPath)
    const coverImage = await uploadOnClodinary(coverImageLocatPath)

    if(!avatar){
        throw new ApiError(500, "Error occured while uploading avtar file");
    }

    const user = await User.create({
        fullName,
        username: username.toLowerCase(), 
        email, 
        password, 
        avatar : avatar.url, 
        coverImage: coverImage?.url || "",
    })

    const createdUser = await user.findById(user._id).select(
        "-password -refershToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Error occured while creating user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser,  "User created successfully")
    )

})

export { registerUser }