//Through Promises
//Utility Grade Code


const asyncHandler = (requestHandler) => {
    (req, res, next)=> {
        Promise.resolve(requestHandler(req,res, next)).catch
        ((err) => next(err))
    }
}


export { asyncHandler }





// Through ASYNC AND AWAIT
// const asyncHandler = (fn) => async (req, res, next) => {
//     try{
//         await fn(req, res, next)
//     }catch (error) {
//         res.status(error.code || 500).json({success: false,
//             message: error.message})
//
//     }
// }