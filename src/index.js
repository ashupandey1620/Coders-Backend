
import connectDB from "./db/index.js"
import dotenv from "dotenv"

dotenv.config({
    path : `./env`
})

connectDB()
    .then(()=>{
        app.listen(process.env.PORT||8000,()=>{
            console.log(`Server is running on port ${process.env.PORT}`)
        })
    })
    .catch((error)=>{
        console.log("MongoDB Connection Failed !!!",error)
    })






















/*
;(async ()=> {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.error("Error:",error);
            throw error
        })

        app.listen(process.env.PORT,()=>{
            console.log("Server is running on port: " + process.env.PORT)
        })
    } catch (error) {
        console.error("Error:",error)
        throw error
    }
} )()

**/
