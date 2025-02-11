import dotenv from "dotenv";
import connectToDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./env",
});

connectToDB()
  .then(() => {
    app.on("error", (error) => {
      console.log(`Error : ${error}`);
    });

    app.listen(process.env.PORT || 5050, () => {
      console.log(`App connected to ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log(`Mongo db connection failed : Error : ${error}`);
  });

/*
import express from "express"
const app = express()


;(async () => {
    try {
       await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`);

       app.on("error", (error) => {
        console.error(`ERROR: ${error}`);
        throw error;
       })

       app.listen(process.env.PORT || 5050, () => {
        console.log(`App is started on PORT: ${process.env.PORT}`)
       })

    } catch (error) {
        console.error(`ERROR: ${error}`);
        throw error;
    }
})()
*/
