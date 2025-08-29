const mongoose = require("mongoose")

const hisaabSchema = new mongoose.Schema({
    data:String,
    topic:String,
    encrypt: Boolean,
    secretCode: String,
    isShare: Boolean,
    editPerms: Boolean,
    nameDate:String,
    idDate:String,
    userId:String,
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user",
        required:true
    }
})

const hData = mongoose.model("hData" , hisaabSchema)


module.exports = hData;
