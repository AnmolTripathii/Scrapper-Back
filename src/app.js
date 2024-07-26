import express from "express"
import cors from "cors"
const app=express()



app.use(express.json({limit:"16kb"}))
const corsOptions = {
  origin: 'https://scrapper-front-hazel.vercel.app',
  methods:["GET","POST","PUT","DELETE"],
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use(express.urlencoded({extended:true,limit:'16kb'}))
app.use(express.static("public"))

import userRouter from './routes/web.routes.js'

app.use("/api/v1/webs",userRouter)

export {app}