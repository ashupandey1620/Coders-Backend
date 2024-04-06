import {Router} from "express";
import {
    loginUser,
    registerUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getProfile,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    addTask,
    updateTask
} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js";


const router = Router();

router.route("/register").post(
    upload.fields(
        [
            {
                name:"avatar",
                maxCount:1
            },
            {
                name:"coverImage",
                maxCount:1
            }
        ]
    ),
    registerUser);


router.route("/login").post(loginUser);

//secured Routes which need access token verification
router.route("/logout").post(verifyJWT, logoutUser)

router.route("/refreshAccess").post(refreshAccessToken)

router.route("/changePassword").post(verifyJWT, changeCurrentPassword)

router.route("/getProfile").get(verifyJWT, getProfile)

router.route("/updateAccount").post(verifyJWT, updateAccountDetails)

router.route("/changeAvatar").patch(verifyJWT, upload.single("avatar"),updateUserAvatar)

router.route("/changeCoverImage").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)

router.route("/addTask").post(verifyJWT,addTask);

router.route("/updateTask").post(verifyJWT,updateTask);

export default router;