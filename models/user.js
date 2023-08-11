const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const pointSchema = new mongoose.Schema({
    Italian: {
        type: Number,
        default: 0},
    
    Spanish: {
        type: Number,
        default: 0},

    French: {
            type: Number,
            default: 0},
    Portuguese: {
            type: Number,
            default: 0},
    German: {
            type: Number,
            default: 0},
    English: {
            type: Number,
            default: 0},

    
  });
 


const userSchema = new Schema({
    
    
    email:{
        type: String,
        required: true
    },

    password:{
        type: String,
        required: true
    },

    name:{
        type: String,
        required: true
    },

    points: pointSchema



}, {timestamp: true});


const User = mongoose.model("user", userSchema);
module.exports = User;