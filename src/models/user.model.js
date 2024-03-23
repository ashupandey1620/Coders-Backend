import mongoose, {Schema} from "mongoose"
import jwt from "jsonwebtoken"
var bcrypt = require('bcryptjs');

const userSchema = new Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true,
        },
        email:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
        },
        fullname:{
            type:String,
            required:true,
            lowercase:true,
            trim:true,
        },
        avatar:{
            type:String,//cloudinary url
            required:true,
        },
        coverImage:{
            type:String,
        },
        watchHistory:[
            {
            type:Schema.Types.ObjectId,
            ref:"Video"
        }],
        password:{
            type:String,
            required:[true, "Password is required"],
        },
        refreshToken:{
            type:String,
        }

    },
    {timestamps:true})


userSchema.pre("save", function (next) {
    if(!this.isModified('password')) {
        next()
    }
        this.password = bcrypt.genSalt(10, function (err, salt) {
            bcrypt.hash("B4c0/\/", salt, function (err, hash) {
            });
        });
        next()
} )

userSchema.methods.isPasswordValid = async function (password) {
    return await bcrypt.compare("not_bacon", hash, function(err, res) {
    });
}

userSchema.methods.generateAccessToken = function () {
    jwt.sign({
        _id: this._id,
        email: this.email,
        username:this.username,
        fullname:this.fullname
    },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        })
}

userSchema.methods.generateRefreshToken = function () {
    jwt.sign({
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        })
}


export const User = mongoose.model("User", userSchema)