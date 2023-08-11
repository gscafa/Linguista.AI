
const getResponse = async () =>{

    const inputBox = document.getElementById("input-box");
    const text = inputBox.value;

    createMessage("user", text);

    inputBox.value = "";

    
    createMessage("system", "...");

    const systemMessages = document.getElementsByClassName("system-message");
    const lastSystemMessage = systemMessages[systemMessages.length-1];

    const userMessages = document.getElementsByClassName("user-message");
    const lastUserMessage = userMessages[userMessages.length-1];

let res = await fetch('http://localhost:5000/getResponse', 
{
method: 'POST',
headers: {
    
    'Content-Type': 'application/x-www-form-urlencoded',
    
}, 
body: new URLSearchParams({
    'prompt': text,
    
})
}
);

const data = await res.json();

if(data.output) {


(lastSystemMessage.children[0]).innerText = (data.output)[data.output.length -1].content;

await getGrading(lastUserMessage.children[0].innerText, lastUserMessage);

}

console.log(data);
}

function delay(milliseconds){
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

const createMessage = (sender, text) =>{

    
    const container = document.getElementById("messages");
    const p = document.createElement("p");
    p.className = "grading-text";

    const div = document.createElement("div");
    const divSpace = document.createElement("div");
    divSpace.className = "space-div";
    div.className = sender + "-message";
    
    const span = document.createElement("span");
    span.innerText = text;
    div.appendChild(span);
    div.append(p);
    
    container.appendChild(div);
   
    container.appendChild(divSpace);
}



const getGrading = async (input, message) =>{

    let res = await fetch('http://localhost:5000/getGrading', 
{
method: 'POST',
headers: {
    
    'Content-Type': 'application/x-www-form-urlencoded',
    
}, 
body: new URLSearchParams({
    'input': input,
    
})
}
);

const data = await res.json();


if(data.output) {
    console.log(data.output);

    let messageBackground = "background-color: ";

    switch(data.output.gravity){
        case 0: messageBackground += "rgba(0,149,255,1)";break;
        case 1: messageBackground += "#d9be14";break;
        case 2: messageBackground += "#c7741c";break;
        case 3: messageBackground += "#d92b14";break;
        default: messageBackground += "rgba(0,149,255,1)";break;
    }

    message.style = messageBackground;
    const p = message.children[1];

    if(data.output.explanation)
        p.innerText = data.output.explanation;

    else
    p.innerText = "No mistakes";


    document.getElementById("points").innerText = "Points: " + data.points;
    document.getElementById("streakCounter").innerText = "Streak: " + data.streakCounter + "/5";
    
    
}




};

const button = document.getElementById("send-button");
const textBox = document.getElementById("input-box");

textBox.addEventListener("keyup", function (event) {
  
    if (event.key === "Enter") {
        button.click();
    }
});



