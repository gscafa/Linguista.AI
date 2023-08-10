const express = require("express");
const bodyParser = require("body-parser");
const { Configuration, OpenAIApi } = require("openai");
const sessions = require("express-session");
const mongoose = require("mongoose");
const Character = require("./models/character");

let dbURI;
let db;
const ai = require("./openai.json");
const helloes = require("./helloes.json");
const secret = require("./sessionSecret.json");

if(process.env.DB_URI)
    dbURI = process.env.DB_URI;

else{
    db = require("./db.json");
    dbURI = db.dbURI;
}

const app = express();
const port = process.env.PORT || 5000;

const configuration = new Configuration({
    organization: ai.organization,
    apiKey: ai.apiKey,
  });

const openai = new OpenAIApi(configuration);

app.use(express.urlencoded());

app.use(sessions({
    secret: secret.secret,
    saveUninitialized:true,
    cookie: { maxAge: 1000 * 60 * 20 },
    resave: false
}));


app.set("view engine", "ejs");
app.set("trust proxy", true); 

app.use(express.static(__dirname + '/views'));




const initializeChat = (req, character, language) =>{
    
    const age = 8;
    const initialPrompt = "You are impersonating " + character + ", you will speak " + language + ". Speak to me as if I were a " + age + " year old. Speak to me keeping in mind that I'm not a native speaker so use an easy set of words. You are friendly. Your response won't be longer than 35 words";
    const messages = [{ role: "system", content: initialPrompt }];
    req.session.language = language;
    req.session.messages = messages;
    
}


const parseGrading = (output) =>{

    let grading = output.split("-");
    let temp = grading[0].split(":");
    let gravity = temp[1];
    temp = grading[1].split(":");
    let explanation = temp[1];

    return {
        gravity: parseInt(gravity),
        explanation: explanation 
    }
};

let streakCounter = 0;
let interactionCounter = 0;
let gravitySum = 0;
let points = 0;
let addPoints;

mongoose.connect(dbURI, {useNewUrlParser: true, useUnifiedTopology: true})
    .then((result) =>{
        app.listen(port, ()=>{
            console.log("In ascolto, porta " + port);
        });
    })
    .catch((err) =>{
        console.log(err);
    });

 


app.get("/",  (req, res) =>{
    req.session.messages = null;
    res.render("index");
    
});

app.get("/chat", (req, res) =>{
    if(!req.session.messages)
        initializeChat(req, req.query.character, req.query.language);

    const greeting = helloes[req.query.language];
    
    Character.findOne()
    .where("name").equals(req.query.character)
    .then(result =>{
        const character = result;
        res.render("chat", {character, greeting});
    })
    .catch(err =>{
        res.render("/");
    })
    
    
})


app.post("/getResponse", async (req, res) =>{

    const messages = req.session.messages;
    if(req.body.prompt)
       messages.push({role: 'user', content: req.body.prompt});
   

    await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: messages
    })
    .then((response) =>{
        messages.push(response.data.choices[0].message);

        req.session.messages = messages;
        
        
        res.status(200).json({output: messages});
    })
    .catch((err) =>{
        res.status(400).json({output: none});
    })

});


app.post("/getGrading", (req, res) =>{

    let input = req.body.input;
    const gradingPrompt = "You are a " + req.session.language + " teacher, your job is to correct a sentence. Provide an explanation of the mistake if there is and grade the gravity of the error using these levels: 0 = no mistakes, 1 = small mistake, 2 = bad mistake, 3 = very bad mistake. The response will be no longer than 30 words and will be structured like the following example: 'Gravity : 1 - Explanation: .... ' .The sentence is the following: "; 

    openai.createChatCompletion({
        model:"gpt-3.5-turbo",
        messages: [{role: "system", content: gradingPrompt + input}]
      })
      .then((response) =>{

        let grading = parseGrading(response.data.choices[0].message.content);
        
        gravitySum += grading.gravity;

        res.status(200).json({output: grading});

        //console.log("Media: " + getAverage(gravitySum, interactionCounter));

        //points += getPointsToAdd(streakCounter, grading.gravity);
        //console.log("Punti: " + points);

        //if(grading.gravity === 0)
          //streakCounter++;

        //else  
          //streakCounter = 0;

      


        //console.log("\n\n" + response.data.choices[0].message.content + "\n\n");
      })

});
