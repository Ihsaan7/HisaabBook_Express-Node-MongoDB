const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
        username:String,
        email:String,
        password:String,
        uId:String,
        dateCreated:String
})

const user = mongoose.model("user", userSchema)

module.exports = user
console.log("User model loaded");
