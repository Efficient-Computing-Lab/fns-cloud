// Selecting element to view chat
var chatBotSession              = document.querySelector( ".chatBot .chatBody .chatSession" )

// Selecting trigger elements of conversation
var chatBotSendButton           = document.querySelector( ".chatBot .chatForm #sendButton" )
var chatBotTextArea             = document.querySelector( ".chatBot .chatForm #chatTextBox" )

// Default values for replies
var chatBotInitiateMessage      = "Hello! &#128513; How can I help you today?<br>Enter /hint for my services!"
var chatBotBlankMessageReply    = "Type something!"
var chatBotReply                = "{{ reply }}"

// Collecting user input
var inputMessage                = ""

// This helps generate text containers in the chat
var typeOfContainer             = ""

//Flags
var flag = new Boolean();

//Risk indicators
const IR_RISK = "is above normal &#10060;";
const IR_VRISK = "indicates very high risk &#9940;";
const IR_NORM = "is considered normal &#9989;";
const HTN_RISK = "indicates risk &#10060;";
const HTN_NORM = "is considered normal &#9989;";

//Step Counters
var riskStep; 
var bmiStep;

//Measurements
let height;
let weight;
let classif;
let ethnicity = new Boolean();

//User's risk form data
let user = {
    sex: "", 
     birth: "",
     weight: "",
     waist: "",
     leisure: "",
     breakfasts: "",
     sugar: "",
     alcohol: "",
     walking: "",
     physical: "",
     legumes: ""
}

//calculate age function
function getAge(date) {
  var dob = new Date(date);
  //calculate month difference from current date in time
  var month_diff = Date.now() - dob.getTime();
  //convert the calculated difference in date format
  var age_dt = new Date(month_diff);
  //extract year from date
  var year = age_dt.getUTCFullYear();
  //now calculate the age of the user
  var age = Math.abs(year - 1970);
  return age;
}

//calulate BMI function
function bmi(height, weight) {
      //calculate BMI
          height = height / 100;
              var BMI = weight / (height * height);
                  return BMI;
}

//calculate htn and ir risk function
function calculateRisks(data) {
  var sex = data.sex;
  var birthDate = data.birth;
  var height = parseInt(data.height);
  var weight = parseInt(data.weight);
  var waist = parseInt(data.waist);
  var screen = parseInt(data.leisure);
  var breakfasts = parseInt(data.breakfasts);
  var sugary = parseInt(data.sugar);
  var alcohol = parseInt(data.alcohol);
  var walking = parseInt(data.walking);
  var physical = parseInt(data.physical);
  var legumes = parseInt(data.legumes);

  height = height * 0.01; //convert cm to m
  //evaluate
  var irPoints = 0;
  var htnPoints = 0;
  var BMI = bmi(height, weight);

  if (BMI < 25) {
    //nothing
  } else if (BMI <= 30) {
    irPoints += 9;
    htnPoints += 10;
  } else {
    irPoints += 19;
    htnPoints += 20;
  }

  if (sex == "female") {
    if (waist < 80) {
      //nothing
    } else if (waist <= 88) {
      irPoints += 3;
    } else {
      irPoints += 7;
    }
  } else { //sex:male
    irPoints += 2;
    htnPoints += 6;
    if (waist < 94) {
      //nothing
    } else if (waist <= 102) {
      irPoints += 3;
    } else {
      irPoints += 7;
    }
  }

  if (screen >= 2) {
    irPoints += 3;
  }

  if (breakfasts < 5) {
    irPoints += 3;
  }

  if (sugary >= 1) {
    irPoints += 2;
  }

  if (walking == 0) {
    irPoints += 2;
  }

  if (physical == 0) {
    irPoints += 2;
    htnPoints += 2;
  }

  if (getAge(birthDate) >= 40) {
    htnPoints += 2;
  }

  if (alcohol >= 3) {
    htnPoints += 2;
  }

  if (legumes < 1) {
    htnPoints += 8;
  }

  return [htnPoints, irPoints];
}


//readFile function
function readFile(file,region){
  let array = new Array();
  var f =  new XMLHttpRequest();
  f.open("GET",file, true);
  f.onreadystatechange = function () {
    if(f.readyState == 4){
      if(f.status == 200 || f.status == 0){
        var res = f.responseText;
        var data = JSON.parse(res);
        //let array = new Array();
        //alert(JSON.stringify(experts));
        //console.log(data['experts'])
        data['experts'].forEach(function (item) {
            //console.log(item);
            if(item['region'] === region){
            array.push(item);
            }
            });
        //console.log(array);
      }
    }
  }
  f.send(null);
  return array;
}
function getHTML(url,region) {
  let array = new Array();
  return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('get', url, true);
      xhr.onload = function () {
      var status = xhr.status;
      if (status == 200) {
      var data = JSON.parse(xhr.response);
      //let array = new Array();
      //alert(JSON.stringify(experts));
      //console.log(data['experts'])
      data['experts'].forEach(function (item) {
          //console.log(item);
          if(item['region'] === region){
          array.push(item);
          }
          });
      resolve(array);
      } else {
      reject(status);
      }
      };
      xhr.send();
  });
}

//add event listener to textBox for when user uses Enter key and doesnt click the send button
chatBotTextArea.addEventListener("keyup", (event)=>{

    if(event.keyCode === 13){
    event.preventDefault();
    chatBotSendButton.click();
    }

    });

// Function to open ChatBot
chatBotSendButton.addEventListener("click", (event)=> {
    // Since the button is a submit button, the form gets submittd and the complete webpage reloads. This prevents the page from reloading. We would submit the message later manually
    event.preventDefault()
    if( validateMessage() ){
    inputMessage    = chatBotTextArea.value
    typeOfContainer = "message"
    createContainer( typeOfContainer )
    setTimeout(function(){
        typeOfContainer = "reply"
        createContainer( typeOfContainer )
        }, 750);
    }
    else{        
    typeOfContainer = "error";
    createContainer( typeOfContainer )
    }
    chatBotTextArea.value = ""
    chatBotTextArea.focus()
    })

async function createContainer( typeOfContainer ) {
  var containerID = ""
    var textClass   = ""
    switch( typeOfContainer ) {
      case "message"      :
        // This would create a message container for user's message
        containerID = "messageContainer"
          textClass   = "message"
          break;
      case "reply"        :
      case "initialize"   :
      case "error"        :
        // This would create a reply container for bot's reply
        containerID = "replyContainer"
          textClass   = "reply"
          break;
      default :
        alert("Error! Please reload the webiste.")
    }

  // Creating container
  var newContainer = document.createElement( "div" )
    newContainer.setAttribute( "class" , "container" )
    if( containerID == "messageContainer" )
      newContainer.setAttribute( "id" , "messageContainer" )
        if( containerID == "replyContainer" )
          newContainer.setAttribute( "id" , "replyContainer" )
            chatBotSession.appendChild( newContainer )

            switch( textClass ) {
              case "message"  :
                var allMessageContainers    = document.querySelectorAll("#messageContainer")
                  var lastMessageContainer    = allMessageContainers[ allMessageContainers.length - 1 ]
                  var newMessage              = document.createElement( "p" )
                  newMessage.setAttribute( "class" , "message animateChat" )
                  newMessage.innerHTML        = inputMessage
                  lastMessageContainer.appendChild( newMessage )
                  lastMessageContainer.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"})
                  break
              case "reply"    :
                  var allReplyContainers      = document.querySelectorAll( "#replyContainer" )    
                    var lastReplyContainer      = allReplyContainers[ allReplyContainers.length - 1 ]
                    var nextReplyContainer = allReplyContainers[ allReplyContainers.length - 1 ]
                    var newReply                = document.createElement( "p" )
                    //create option list for available regions
                    var newSelectReply        = document.createElement("select");
                  newSelectReply.id = "list";
                  newSelectReply.setAttribute("class","reply animateChat accentColor");
                  var option1 = document.createElement("option");
                  option1.text = 'Pagrati'
                    option1.value = 'Pagrati'
                    var option2 = document.createElement("option");
                  option2.text = 'Nea Smirni'
                    option2.value = 'Nea Smirni'
                    var option3 = document.createElement("option");
                  option3.text = 'Ampelokipoi'
                    option3.value = 'Ampelokipoi'
                    newSelectReply.appendChild(option1);
                  newSelectReply.appendChild(option2);
                  newSelectReply.appendChild(option3);
                  //create date element
                  let date = document.createElement("input");
                  date.setAttribute("id","user-date");
                  date.setAttribute("type","date")
                  date.setAttribute("class","reply animateChat accentColor");

                  newReply.setAttribute( "class" , "reply animateChat accentColor" )
                    switch( typeOfContainer ){
                      case "reply"        :
                        if( inputMessage.includes("dietologist")){
                          newReply.innerHTML  = "Choose your region. Type 'okay' when done!";
                          lastReplyContainer.appendChild( newReply )
                            //create a new container for select element
                            var selectContainer = document.createElement( "div" )
                            selectContainer.setAttribute( "class" , "container" )
                            selectContainer.setAttribute( "id" , "replyContainer" )
                            chatBotSession.appendChild( selectContainer )

                            selectContainer.appendChild(newSelectReply)
                            flag = new Boolean(true);
                        } else if( inputMessage.toLowerCase() == "no" || inputMessage.toLowerCase().includes("bye") || inputMessage.toLowerCase().includes("goodbye")){
                          newReply.innerHTML = "Understood. Goodbye!"
                            lastReplyContainer.appendChild( newReply )
                        } else if( inputMessage.toLowerCase().includes("ok") && flag == true) {
                          newReply.innerHTML = "Here are a few dietologists available in your area:"
                            lastReplyContainer.appendChild( newReply )
                            let region = document.getElementById("list").value;
                          let experts = await getHTML('js/experts.json',region);
                          //alert(experts);
                          console.dir(experts);

                          //create a new container for list of experts
                          var newList = document.createElement( "div" )
                            newList.setAttribute( "class" , "container" )
                            newList.setAttribute( "id" , "replyContainer" )
                            chatBotSession.appendChild( newList )

                            let newOption = document.createElement("p"); 
                          newOption.setAttribute("class", "reply animateChat accentColor");
                          let html = '';
                          let i = 1;
                          for(let item of experts){
                            console.log("yes");
                            if(i==1){
                              html = "<ul>"
                            }
                            html = html + "<li>"+item['name']+"</li><li>Tel:"+item['phone_number']+"</li><li>Address:"+item['address']+"</li><br>"
                              console.dir(html);
                            if(i == experts.length){
                              html = html + "</ul>"
                            }
                            i++;

                          }
                          console.dir(html);
                          newOption.innerHTML = html;
                          newList.appendChild(newOption);
                          flag = new Boolean(false);
                        } else if(inputMessage.toLowerCase().includes("joke")){
                          newReply.innerHTML = "Why did the programmer quit his job? <br> Because he didn't get arrays &#128526;" ;
                          lastReplyContainer.appendChild(newReply)
                        } else if(inputMessage.includes("/hint") || inputMessage.includes("hint")){
                          newReply.innerHTML = "You can ask me: <br><ul><li>&#10004;Find me a dietologist</li><li>&#10004;Calculate Hypertension and Insulin Resistance risks</li><li>&#10004;Find my BMI</li><li>&#10004;Tell me a joke</li><li>&#10004;How are you?</li></ul>" ;
                          lastReplyContainer.appendChild(newReply)
                        } else if(inputMessage.includes("how are you") || inputMessage.includes("How are you")){
                          newReply.innerHTML = "I am doing good! How about you?" ;
                          lastReplyContainer.appendChild(newReply)
                        } else if(inputMessage.includes("bmi") || inputMessage.includes("BMI")){
                          newReply.innerHTML = "Alright. What is your height in centemeters?" ;
                          bmiStep = 1;
                          //hFlag = new Boolean(true);
                          lastReplyContainer.appendChild(newReply)
                        } else if( bmiStep == 1 && !isNaN(parseFloat(inputMessage)) ){
                          height = parseFloat(inputMessage) / 100;
                          newReply.innerHTML = "What is your weight in kilograms?";
                          //hFlag = new Boolean(false);
                          //wFlag = new Boolean(true);
                          bmiStep++;
                          lastReplyContainer.appendChild(newReply);
                        } else if( bmiStep == 2 && !isNaN(parseFloat(inputMessage)) ){
                          newReply.innerHTML = "Are you Asian or non-Asian?";
                          weight = parseFloat(inputMessage); //convert string to int
                          //wFlag = new Boolean(false);
                          //eFlag = new Boolean(true);
                          bmiStep++;
                        } else if( bmiStep == 3 && (inputMessage.toLowerCase().includes("non","asian") || inputMessage.toLowerCase() == "asian")){
                          if(inputMessage.toLowerCase().includes("non asian")){
                            ethnicity = new Boolean(true);
                          } else {
                            ethnicity = new Boolean(false);
                          }
                          let bmi = (weight / (height * height)).toFixed(2);
                          if( ethnicity == true ){ //non asian
                            if( bmi<18.5) {
                              classif = "underweight";
                            } else if( bmi>=18.5 && bmi<=24.9 ){
                              classif = "normal weight";
                            } else if( bmi>= 25.0 && bmi <=29.9 ){
                              classif = "overweight";
                            } else if( bmi>= 30.0 && bmi <=34.9 ){
                              classif = "obese (class I)"
                            } else if( bmi>= 35.0 && bmi <=39,9 ){
                              classif = "obese (class II)";
                            } else if( bmi>= 40.0){
                              classif = "obese (class III)";
                            } else {
                              newReply.innerHTML = "Something went wrong! Are you sure you gave me valid measurements?";
                              lastReplyContainer.appendChild(newReply);
                              break;
                            }
                          } else { //asian
                            if( bmi<18.5) {
                              classif = "underweight";
                            } else if( bmi>=18.5 && bmi<=22.9 ){
                              classif = "normal weight";
                            } else if( bmi>= 23.0 && bmi <=24.9 ){
                              classif = "overweight";
                            } else if( bmi>= 25.00 && bmi <=29.9 ){
                              classif = "obese (class I)"
                            } else if( bmi>=30.0 ){
                              classif = "obese (class II)";
                            } else {
                              newReply.innerHTML = "Something went wrong! Are you sure you gave me valid measurements?";
                              lastReplyContainer.appendChild(newReply);
                              break;
                            }
                          }
                          newReply.innerHTML = "Your BMI is "+bmi+" and your classification is "+classif+".";
                          lastReplyContainer.appendChild(newReply);
                          //wFlag = new Boolean(false);
                        } else if(inputMessage.includes("risk")){
                          riskStep = 1;
                          newReply.innerHTML = "Understood! First, are you male or female?"
                          lastReplyContainer.appendChild(newReply);
                        } else if(riskStep == 1 && (inputMessage.toLowerCase().includes("male") || inputMessage.toLowerCase().includes("female"))){
                          riskStep++;
                          if(inputMessage.toLowerCase().includes("male")){
                            user.sex = "male";
                          } else {
                            user.sex = "female";
                          }
                          newReply.innerHTML = "Alright! Choose the correct date of birth, and enter 'okay' when done!";
                          lastReplyContainer.appendChild(newReply);

                          //create a new container for input (date) element
                            var selectContainer = document.createElement( "div" )
                            selectContainer.setAttribute( "class" , "container" )
                            selectContainer.setAttribute( "id" , "replyContainer" )
                            chatBotSession.appendChild( selectContainer )

                            selectContainer.appendChild(date)
                        } else if(riskStep == 2 && inputMessage.toLowerCase().includes("ok")){
                          riskStep++;
                          console.log(document.getElementById("user-date").value);
                          user.birth = document.getElementById("user-date").value; //set user's birth date
                          newReply.innerHTML = "What is your height in centemetres?";
                          lastReplyContainer.appendChild(newReply);
                        } else if( riskStep == 3 && !isNaN(parseFloat(inputMessage)) ){
                          riskStep++;
                          height = parseFloat(inputMessage) / 100;
                          user.height = height; //set user's height
                          newReply.innerHTML = "What is your weight in kilograms?"; 
                          lastReplyContainer.appendChild(newReply);
                        } else if( riskStep == 4 && !isNaN(parseFloat(inputMessage)) ){
                          riskStep++;
                          newReply.innerHTML = "Okay! What is your waist circumference in centemetres?";
                          weight = parseFloat(inputMessage); //convert string to int 
                          lastReplyContainer.appendChild(newReply);
                          user.weight = weight; //set user's weight
                        } else if( riskStep == 5 && !isNaN(parseFloat(inputMessage))){
                          riskStep++;
                          user.waist = parseFloat(inputMessage); //set user's waist 
                          newReply.innerHTML = "Thank you, how many hours does your leisure screen time last per day?"
                          lastReplyContainer.appendChild(newReply);
                        } else if( riskStep == 6 && !isNaN(parseFloat(inputMessage))){
                          if(parseFloat(inputMessage)>24){
                            newReply.innerHTML = "More than 24 hours per day? &#128558; Let's try again..."
                            lastReplyContainer.appendChild(newReply);
                            break; 
                          }
                          riskStep++;
                          user.leisure = parseFloat(inputMessage); //set user's leisure screen time
                          newReply.innerHTML = "How many sugary portions do you consume per week? (1 portion is 250ml)"
                          lastReplyContainer.appendChild(newReply);
                        } else if( riskStep == 7 && !isNaN(parseFloat(inputMessage))){
                          riskStep++;
                          user.sugar = parseFloat(inputMessage); //set user's sugary portions
                          newReply.innerHTML = "How many breakfasts do you have per week?"
                          lastReplyContainer.appendChild(newReply);
                        } else if( riskStep == 8 && !isNaN(parseFloat(inputMessage))){
                          if(parseFloat(inputMessage)>7){
                            newReply.innerHTML = "You can't have more than 7 breakfasts per week &#128558;! Let's try again..."
                            lastReplyContainer.appendChild(newReply);
                            break;
                          }
                          riskStep++;
                          user.breakfasts = parseFloat(inputMessage); //set user's number of breakfasts
                          newReply.innerHTML = "How many portions of alcohol do you consume per week?<br>(1 portion = 125mL of wine, 330mL of beer or 40mL of hard Liquor)"
                          lastReplyContainer.appendChild(newReply);
                        } else if( riskStep == 9 && !isNaN(parseFloat(inputMessage))){
                          riskStep++;
                          user.alcohol = parseFloat(inputMessage); //set user's alcohol portions
                          newReply.innerHTML = "We are close! Do you walk at least three times per week? (around 30 minutes each)"
                          lastReplyContainer.appendChild(newReply);
                        } else if( riskStep == 10 && (inputMessage.toLowerCase().includes("yes") || inputMessage.toLowerCase().includes("no")) ){
                          riskStep++;
                          if(inputMessage.toLowerCase().includes("yes")){
                            user.walking = 1; //set user's walking state
                          } else {
                            user.walking = 0;
                          }
                          newReply.innerHTML = "Understood. Do you perform any vigorous physical activity for at least 3 times per week? (around 10 minutes each)"
                          lastReplyContainer.appendChild(newReply);
                        
                        } else if( riskStep == 11 && (inputMessage.toLowerCase().includes("yes") || inputMessage.toLowerCase().includes("no")) ){
                          riskStep++;
                          if(inputMessage.toLowerCase().includes("yes")){
                            user.physical = 1; //set user's physical state
                          } else {
                            user.physical = 0;
                          }
                          newReply.innerHTML = "Lastly, how many cups of legumes do you consume per week?"
                          lastReplyContainer.appendChild(newReply);
                        } else if( riskStep == 12 && !isNaN(parseInt(inputMessage))){
                          riskStep++;
                          user.legumes = parseInt(inputMessage);
                          newReply.innerHTML = "We are done! Let me now do my calculations..."
                          lastReplyContainer.appendChild(newReply);
                          console.log(calculateRisks(user));
                          let [htnPoints, irPoints] = calculateRisks(user);
                          //create a new container for htns
                          var htnContainer = document.createElement( "div" )
                          htnContainer.setAttribute( "class" , "container" )
                          htnContainer.setAttribute( "id" , "replyContainer" )
                          chatBotSession.appendChild( htnContainer )

                          //create p element for message
                          let htnText = document.createElement("p")
                          htnText.setAttribute("class", "reply animateChat accentColor");

                          if(htnPoints>= 26){
                            htnText.innerHTML = "Your hypertension risk score is "+htnPoints+", and it "+HTN_RISK+".";
                          } else {
                            htnText.innerHTML = "Your hypertension risk score is "+htnPoints+", and it "+HTN_NORM+".";
                          }
                          htnContainer.appendChild(htnText);

                          //create a new container for insulin resistance scores
                          var irContainer = document.createElement( "div" )
                          irContainer.setAttribute( "class" , "container" )
                          irContainer.setAttribute( "id" , "replyContainer" )
                          chatBotSession.appendChild( irContainer )
                          //create p element for message
                          let irText = document.createElement("p")
                          irText.setAttribute("class", "reply animateChat accentColor");

                          if(irPoints>= 23 && irPoints <=30){
                            irText.innerHTML = "Your insulin resistance risk score is "+irPoints+", and it "+IR_RISK+".";
                          } else if(irPoints>=31) {
                            irText.innerHTML = "Your insulin resistance risk score is "+irPoints+", and it "+IR_VRISK+".";
                          } else {
                            irText.innerHTML = "Your insulin resistance risk score is "+irPoints+", and it "+IR_NORM+".";
                          }
                          irContainer.appendChild(irText);


                        } else {
                          console.log(riskStep);
                          newReply.innerHTML = "I am sorry, I cannot understand you. Try something else maybe?"
                            lastReplyContainer.appendChild( newReply )
                        }
                        break
                      case "initialize"   :
                          newReply.innerHTML  = chatBotInitiateMessage
                            break
                      case "error"        :
                            newReply.innerHTML  = chatBotBlankMessageReply
                              break
                      default             :
                              newReply.innerHTML  = "Sorry! I could not understannd."
                    }
                  setTimeout(function (){
                      lastReplyContainer.appendChild( newReply )
                      lastReplyContainer.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"})
                      }, 10)            
                  break
              default         :
                    console.log("Error in conversation")
            }
}

function initiateConversation() {
  chatBotSession.innerHTML = ""
    typeOfContainer = "initialize"
    createContainer( typeOfContainer )
}
