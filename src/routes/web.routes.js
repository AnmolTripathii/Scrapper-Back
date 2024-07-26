import { Router } from "express";
import { deleteGenerates, generateAll, generateAndSave } from "../controller/web.controller.js";

const router=Router()

router.route("/generate").post(generateAndSave)
router.route("/allwebs").get(generateAll)
router.route("/delete").post(deleteGenerates)

export default router