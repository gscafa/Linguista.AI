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
    

    const div = document.createElement("div");
    const divSpace = document.createElement("div");
    divSpace.className = "space-div";
    div.className = sender + "-message";
    
    const span = document.createElement("span");
    span.innerText = text;
    div.appendChild(span);
    
    
    container.appendChild(div);
   
    container.appendChild(divSpace);
}


const button = document.getElementById("send-button");
const textBox = document.getElementById("input-box");

textBox.addEventListener("keyup", function (event) {
  
    if (event.key === "Enter") {
        button.click();
    }
});



