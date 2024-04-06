import mongoose, {Schema} from "mongoose"

const taskSchema = new Schema(
    {
        taskName:{
            type:String,
            required:true,
            lowercase:true,
            trim:true,
        },
        description:{
            type:String,
            required:true,
            lowercase:true,
            trim:true,
        },
        startTime:{
            type:String,
            required:true,
        },
        endTime: {
            type:String,
            required:true,
        },
        success:{
            type:Boolean,
            required:true
        },
        userName:{
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {timestamps:true})


export const Task = mongoose.model("Task", taskSchema)
