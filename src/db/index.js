import mongoose from "mongoose";
import {DB_NAME} from "../constant.js";

const connectDB = async() => {
    try{
        const connectionInstance= await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MONGODB Connected Successfully!! DB HOST: ${connectionInstance.connection.host}\n`);
    }catch (error) {
        console.error("Mongo DB connection error:", error);
        process.exit(1)
    }
}

export default connectDB