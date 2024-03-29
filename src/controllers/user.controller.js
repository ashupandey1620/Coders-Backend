import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";




const generateAccessToken = async (userId) => {
    try{
        const user = await User.findById(userId)

        const accessToken = user.generateAccessToken()

        console.log("This is the Access TOken   ",accessToken)

        return accessToken

    }catch(error){
        throw new ApiError(500,"Something went wrong while generating Access Token");
    }

}

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

    if(!isPasswordValid){
        throw new ApiError(400,"Invalid User Credentials")
    }

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

    if(!refreshTokenAya){
        throw new ApiError(401,"Refresh token is required")
    }

    try{

        console.log("Refresh token secret ", process.env.REFRESH_TOKEN_SECRET)

        const decodedToken = jwt.verify(
            refreshTokenAya,
            process.env.REFRESH_TOKEN_SECRET,
        )

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

        const accessToken = await generateAccessToken(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .json(
                new ApiResponse(
                    200,
                    {accessToken},
                    "Access token refreshed"
                )
            )

    }catch(error) {
        throw new ApiError(400,error)
    }
})

const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {oldPassword, newPassword, confirmPassword} = req.body

    if(newPassword !== confirmPassword)
    {
        throw new ApiError(401,"Password and Confirm Password is not same")
    }

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordValid(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Old Password")
    }

    user.password = newPassword

    await user.save({validateBeforeSave:false})

    return res.status(200).json(
        new ApiResponse(200,{},"Password Changed Successfully")
    )
})

const getProfile = asyncHandler(async (req,res)=>{
    console.log( "User Profile details ",req.user)
    return res.status(200).json(  new ApiResponse(200, req.user, "User Profile Fetched Successfully"))
})

const updateAccountDetails = asyncHandler(async (req,res)=>{
    const {fullname, email} = req.body

    if(!fullname||!email){
        throw new ApiError(400,"All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullname: fullname,
                email: email
            }
        },
        {new: true}
    ).select("-password")


    return res
        .status(200)
        .json(new ApiResponse(200,user,"Account Details Updated Successfully"))


})

const updateUserAvatar = asyncHandler(async (req,res)=>{
    const avaterLocalpath = req.file?.path

    if(!avaterLocalpath){
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avaterLocalpath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar:avatar.url,
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200,user,"Avatar Image Updated Successfully")
    )
})

const updateUserCoverImage = asyncHandler(async (req,res)=>{
    const coverLocalpath = req.file?.path

    console.log(coverLocalpath)

    if(!coverLocalpath){
        throw new ApiError(400,"Cover Image file is missing")
    }

    const cover = await uploadOnCloudinary(coverLocalpath)

    if(!cover.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                coverImage:cover.url,
            }
        },
        {new: true}
    ).select("-password")


    return res.status(200).json(
        new ApiResponse(200,user,"Cover Image Updated Successfully")
    )
})


const getUserChannelProfile = asyncHandler(async (req,res)=>{

    const {userName} = req.params
    if(!userName?.trim()){
        throw new ApiError(400,"User Name is missing")
    }

    const channel  = await User.aggregate(
        [
            {
                $match: {
                    userName:userName?.toLowerCase()
                }
            },
            {
                $lookup : {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as:"subscribers"
                }
            },
            {
                $lookup : {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as:"subscribedTo"
                }
            },
            {
                $addFields:{
                    subscribersCount :{
                        $size : "$subscribers"
                    },
                    channelSubscribedTo:{
                        $size : "$subscribedTo"
                    },
                    isSubscribed:{
                        $cond:{
                            if: {
                                $in: [req.user?._id,"$subscribers.subscriber"]
                            },
                            then:true,
                            else:false
                        }
                    }
                }
            },
            {
                $project:{
                    fullname:1,
                    isername:1,
                    subscribersCount:1,
                    channelSubscribedTo:1,
                    isSubscribed:1,
                    avatar:1,
                    coverImage:1,
                    email:1
                }
            }
            ]
    )

    if(!channel?.length){
        throw new ApiError(400,"Channel does not exist")
    }

    return res.status(200).json(
        new ApiResponse(200,channel[0],"User Channel Fetched Successfully")
    )
})

export {
    loginUser,
    registerUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getProfile,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile
};