import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import process from "mongoose-aggregate-paginate-v2/.eslintrc.js";


const generateAccessAndRefreshToken = async (userId) => {
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // console.log("Access Token from generate both",accessToken)
        // console.log("Refresh Token from generate both",refreshToken)

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken, refreshToken}

    }catch(error){
        throw new ApiError(500,"Something went wrong while generating Access and Refresh Token");
    }
}

const registerUser = asyncHandler(async (req,res)=>{

    //get user details from user
    // validation on the data
    //check if user is already exist:username,email
    //check for images, check for avatar
    //upload them to cloudinary, avatar
    //create user Object - create entry in DB
    //reomove password and refresh token field from response
    //check for user creation
    //return res

    // console.log("registerUser");

    const {fullname, email, password, username} = req.body;
    // console.log("email", email);


    if([fullname, email, password, username].some((field)=>
    field?.trim() === "")){
        throw new ApiError(400,"All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar local path is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    const user = await User.create({
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
        }
    )

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )


    if(!createdUser){
       // console.log(createdUser)
        throw new ApiError(500,"Something went wrong while registering the user")
    }


    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered Successfully")
    )


})

const loginUser = asyncHandler(async (req,res)=>{
    // take data from the req body
    //check username or email
    //find the user
    //password check
    //access and refresh token
    //send cookies


    const {email,username,password}=req.body


    if(!username && !email){
        throw new ApiError(400,"Username or email is required")
    }

    const user = await User.findOne({
        $or: [{email},{username}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    const isPasswordValid = await user.isPasswordValid(password)

    // console.log(isPasswordValid)
    if(!isPasswordValid){
        throw new ApiError(400,"Invalid User Credentials")
    }

    // console.log(user._id)

    // console.log(await generateAccessAndRefreshToken(user._id))

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    console.log("checking\n\n"+accessToken+"\n\n\n",refreshToken)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")


    console.log(loggedInUser)


    const options = {
        httpOnly:true,
        secure:true
    }



    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged in successfully"
            )
        )

})

const logoutUser = asyncHandler(async (req,res)=>{
    req.user._id = await User.findByIdAndUpdate(req.user._id,{$set:{refreshToken: undefined}},{new: true})

    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200,{},"User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req,res)=>{
    const refreshTokenAya = req.cookies?.refreshToken || req.header("Authorization")?.replace("Bearer ", "");

    if(!refreshToken){
        throw new ApiError(401,"Refresh token is required")
    }

    try{
        const decodedToken = jwt.verify(
            refreshTokenAya,
            process.env.REFRESH_TOKEN_SECRET,
        )

        console.log("DECODED TOKEN " + decodedToken)

        const user = await User.findById(decodedToken?._id)

        if(!user){
            throw new ApiError(401,"Invalid Refresh token")
        }

        if(refreshTokenAya !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used")
        }

        const options = {
             httpOnly:true,
            secure:true
        }

        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshTokenAya, options)
            .json(
                new ApiResponse(
                    200,
                    {accessToken, refreshToken: refreshTokenAya},
                    "Access token refreshed"
                )
            )

    }catch(error) {
        throw new ApiError(400,"Invalid refresh token")
    }
})

export {loginUser, registerUser, logoutUser, refreshAccessToken};