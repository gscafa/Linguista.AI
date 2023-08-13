const express = require("express");
const bodyParser = require("body-parser");
const { Configuration, OpenAIApi } = require("openai");
const sessions = require("express-session");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Character = require("./models/character");
const User = require("./models/user");


let dbURI;
let db;
const ai = require("./openai.json");
const greetings = require("./greetings.json");
const secret = require("./sessionSecret.json");
const studyPrompts = require("./studyPrompts.json");
const maxPoints = 5500;
const pointsThresholds = {
    1: 0,
    2: 1500,
    3: 3250,
    4: maxPoints
};
const languages = ["English", "Spanish", "Italian", "French", "German", "Portuguese"];

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


const compareByLevel = (a, b) =>{
    return a.level - b.level;
};
  
  

const initializeChat = (req, character, language) =>{
    
    const age = 8;
    const initialPrompt = "You are impersonating " + character + ", you will speak " + language + ". Speak to me as if I were a " + age + " year old. Speak to me keeping in mind that I'm not a native speaker so use an easy set of words. You are friendly. Your response won't be longer than 35 words";
    const messages = [{ role: "system", content: initialPrompt }];
    req.session.language = language;
    req.session.messages = messages;
    
    
};


const initializeStudyChat = (req, language, teacherLanguage) =>{
    
    const initialPrompt = (studyPrompts[teacherLanguage]) + language;
    
    const messages = [{ role: "system", content: initialPrompt }];
    req.session.language = language;
    req.session.messages = messages;
    
    
};


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

const getPointsToAdd = (streakCounter, gravity) =>{
    let pointsToAdd = 60;
    pointsToAdd -= pointsToAdd * parseInt(gravity/3);
    
    switch(streakCounter){
      case 1: pointsToAdd *= 1.1; break;
      case 2: pointsToAdd *= 1.2; break;
      case 3: pointsToAdd *= 1.3; break;
      case 4: pointsToAdd *= 1.4; break;
      case 5: pointsToAdd *= 1.5; break;
      default: break;
    }
  
    return parseInt(pointsToAdd);
  };


const updateStreakCounter = (gravity, streakCounter) =>{

    if(gravity > 0){
        return 0;
    }

    if(streakCounter >= 5){
        return streakCounter;
    }

    else 
        return streakCounter + 1;

};




let interactionCounter = 0;
let gravitySum = 0;

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


app.get("/", (req, res) =>{
    res.render("index");
});
 

app.get("/selectMode", (req, res) =>{
    
    if(req.session.user)   {
        let user = req.session.user;
        let character = null;
        req.session.messages = null;
        res.render("select_mode", {user, character});
    }
      
    else{
        res.redirect("/login");
    }

    

});

app.get("/studyMode", (req, res) =>{

    const language = req.query.language;
    const teacherLanguage = req.query.teacherLanguage;
    const character = null;

    let user;

    if(req.session.user)   
        user = req.session.user;
    else{
        res.redirect("/login");
    }

            const greeting = greetings[teacherLanguage];

            if(!req.session.messages)
                initializeStudyChat(req, language, teacherLanguage);

            res.render("study_chat", {character, greeting, language, teacherLanguage, user});
        
})



app.get("/practiceMode", (req, res) =>{

    let user;
    let character = null;
    req.session.messages = null;
    req.session.streakCounter = 0;

    if(req.session.user){

        user = req.session.user;
        res.render("practice_mode", {user, character, languages, maxPoints});
    }

    else
    res.redirect("/login");
    
});


app.get("/practiceCharacters",  (req, res) =>{
    let user;
    let character = {
        language: req.query.selectedLanguage
    };
    req.session.messages = null;
    req.session.streakCounter = 0;
    if(req.session.user){
        
        Character.find()
        .where("language").equals(req.query.selectedLanguage)
        .then(characters =>{
            if(characters){
                // Sort the array by age in ascending order
                characters.sort(compareByLevel);
                user = req.session.user;
                res.render("practice_characters", {user, characters, character, pointsThresholds});
            }
        })
        .catch(err=>{
            res.send("<h1>Error</h1>");
        });


        
    }   
        
    else{
        res.redirect("/login");
    }
    
});


app.get("/practiceChat", (req, res) =>{

    let user;

    if(req.session.user)   
        user = req.session.user;
    else{
        res.redirect("/login");
    }

    

    Character.findById(req.query.character)
    .then(character =>{
        if(character){

            if( (user.points[character.language] < pointsThresholds[character.level]) )
                res.redirect("/practiceCharacters?selectedLanguage=" + character.language);

            else{

                const greeting = greetings[character.language];

                if(!req.session.messages)
                    initializeChat(req, character.name, character.language);

                res.render("practice_chat", {character, greeting, user});

            }
        }
        else 
            res.send("<h1>Error</h1>");


    })
    .catch(err =>{
        res.send("<h1>Error</h1>");
    });
    
    
});

app.get("/login", (req, res) =>{

    res.render("login");
});



app.post("/doLogin", (req, res) =>{

    const email = req.body.email;
    const password = crypto.createHash("sha512").update(req.body.password).digest("hex");
    
    User.findOne()
    .where("email").equals(email)
    .where("password").equals(password)
    .then(result =>{
        
        if(result){
            let user = {
                _id : result._id,
                name: result.name,
                points: result.points
            };
            req.session.user = user;
            res.redirect("/selectMode");
        }

        else
            res.redirect("/login");

    }).catch(err=>{
        res.send("<h1>Error</h1>");
    });
    

});

app.get("/doLogout", (req, res) =>{
    User.findByIdAndUpdate(req.session.user._id, { points: req.session.user.points })
    .then(result =>{
        req.session.destroy();
        res.redirect("/");
    })
    .catch(err =>{
        res.send("<h1>Error</h1>");
    });

   
});


app.get("/register", (req, res) =>{
    res.render("register");
});


app.post("/doRegister", (req, res) =>{
//TODO ASYNC CHECK IF USER ALREADY EXISTS
    const user = {
        name: req.body.name,
        email: req.body.email,
        password: crypto.createHash("sha512").update(req.body.password).digest("hex"),
        points: {
            Italian: 0,
            Spanish: 0,
            French: 0,
            Portuguese: 0,
            German: 0,
            English: 0
        }

    };

    User.create(user)
    .then(result =>{
        res.redirect("/login");
    })
    .catch(err =>{
        res.redirect("/register");
    })

});


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

    let streakCounter = req.session.streakCounter;
    let points = req.session.user.points;
    let input = req.body.input;
    const gradingPrompt = "You are a " + req.session.language + " teacher, your job is to correct a sentence. Provide an explanation of the mistake if there is and grade the gravity of the error using these levels: 0 = no mistakes, 1 = small mistake, 2 = bad mistake, 3 = very bad mistake. The response will be no longer than 30 words and will be structured like the following example: 'Gravity : 1 - Explanation: .... ' .The sentence is the following: "; 

    openai.createChatCompletion({
        model:"gpt-3.5-turbo",
        messages: [{role: "system", content: gradingPrompt + input}]
      })
      .then((response) =>{

        let grading = parseGrading(response.data.choices[0].message.content);
        
        gravitySum += grading.gravity;

        
        streakCounter = updateStreakCounter(grading.gravity, streakCounter);

        points[req.session.language] += getPointsToAdd(streakCounter, grading.gravity);
        

        req.session.user.points = points;
        req.session.streakCounter = streakCounter;

        User.findByIdAndUpdate(req.session.user._id, {points: points}).then(result =>{
            res.status(200).json({output: grading, points: points, streakCounter: streakCounter, language: req.session.language});
        });

        

 
      });



});
