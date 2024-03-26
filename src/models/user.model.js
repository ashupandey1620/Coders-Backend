import mongoose, {Schema} from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

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


userSchema.pre("save", async function (next) {
    try {
        if (!this.isModified('password')) {
            return next();
        }
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        return next();
    } catch (error) {
        return next(error);
    }
} )

userSchema.methods.isPasswordValid = async function (password) {
    console.log(password)
    try {
        // Compare the provided password with the hashed password stored in the database
        const isValid = await bcrypt.compare(password, this.password);
        return isValid;
    } catch (error) {
        // Handle errors appropriately
        console.error("Error comparing passwords:", error);
        return false;
    }
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