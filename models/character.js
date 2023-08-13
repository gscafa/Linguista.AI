const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const characterSchema = new Schema({
    
    
    name:{
        type: String,
        required: true
    },

    language:{
        type: String,
        required: true
    },

    imgPath:{
        type: String,
        required: true
    },

    level:{
        type: Number,
        required: true
    }

}, {timestamp: true});


const Character = mongoose.model("character", characterSchema);
module.exports = Character;