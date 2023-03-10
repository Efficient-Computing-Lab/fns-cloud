

function displayQuestions(answer) {

    document.getElementById('yesQuestion').style.display = "block";

  if (answer == "No") { // hide the div that is not selected
    document.getElementById('yesQuestion').style.display = "none";
  }

}

window.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOM fully loaded and parsed');
 //   getUser(event);
//    document.getElementById("risk-form").addEventListener('submit', calculateRisk);

});

function recentType(a,type){  //a:array type:string
    var result = {type: "", metric: "", timestamp: 0};

    for(i=0;i<a.length;i++){
         if(a[i].type == type){
            tmp2 = new Date(result.timestamp);
            let tmp1 = new Date(a[i].timestamp);
            console.log("tmp1",tmp1);
            console.log("tmp2",tmp2);
            if(tmp1.getTime() > tmp2.getTime()){
                result = a[i];
            }
        }
    }
    return result;
}

function getAge(date){

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

function getUser(event){
	console.log(event)

	event.preventDefault();


    fetch('http://localhost:3000/user/?username=me', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		},
		cache: 'default',
	})
	.then((response) => {
            console.log(response);

            return response.json();
        }
        )
	.then(function(data){
        console.log(data);
        console.log(data.sex);
        var tbodyRef = document.getElementById('myTable').getElementsByTagName('tbody')[0];

        // Insert a row at the end of table
        var newRow = tbodyRef.insertRow();

        var newCell = newRow.insertCell();
        var newText = document.createTextNode(data.credentials.email);
        newCell.appendChild(newText);

        // Insert a cell at the end of the row
        var newCell = newRow.insertCell();

        // Append a text node to the cell
        var newText = document.createTextNode(data.sex);
        newCell.appendChild(newText);

        // Insert a cell at the end of the row
        var newCell = newRow.insertCell();

        // Append a text node to the cell
        var newText = document.createTextNode(data.ethnicity);
        newCell.appendChild(newText);

        var dateTmp = new Date(data.birth); //get date object
        var date = dateTmp.toLocaleDateString("en-US"); //get converted string

        // Insert a cell at the end of the row
        var newCell = newRow.insertCell();

        // Append a text node to the cell
        var newText = document.createTextNode(date);
        newCell.appendChild(newText);


        var a = data.measurement;
        var height = recentType(a,"height");
        var weight = recentType(a,"weight");
        var ir_risk = recentType(a,"ir_risk");
        var htn_risk = recentType(a,"htn_risk");
        var weight_goal = recentType(a,"weight_goal");

        console.log(weight_goal);
        // Insert a cell at the end of the row
        var newCell = newRow.insertCell();

        // Append a text node to the cell
        var newText = document.createTextNode(height.value);
        newCell.appendChild(newText);

        // Insert a cell at the end of the row
        var newCell = newRow.insertCell();

        // Append a text node to the cell
        var newText = document.createTextNode(weight.value);
        newCell.appendChild(newText);


        var newCell = newRow.insertCell();
        var newText = document.createTextNode(ir_risk.value);
        newCell.appendChild(newText);

        var newCell = newRow.insertCell();
        var newText = document.createTextNode(htn_risk.value);
        newCell.appendChild(newText);

        var newCell = newRow.insertCell();
        var newText = document.createTextNode(weight_goal.value);
        newCell.appendChild(newText);

	})
	.catch((error) => {
		console.error('Error:', error);
    });
}

function calculateRisk(event){
    return;

    console.log(event)
	event.preventDefault();

    //collect form data
 	var sex = document.querySelector('input[name="sex"]:checked').value
	var birthDate = document.getElementById("risk-form").elements[2].value;
	var height = document.getElementById("risk-form").elements[3].value;
	var weight = document.getElementById("risk-form").elements[4].value;
	var waist = document.getElementById("risk-form").elements[5].value;
	var screen = document.getElementById("risk-form").elements[6].value;
	var breakfasts = document.getElementById("risk-form").elements[7].value;
	var sugary = document.getElementById("risk-form").elements[8].value;
	var alcohol = document.getElementById("risk-form").elements[9].value;
	var walking = document.querySelector('input[name="walking"]:checked').value
	var physical = document.querySelector('input[name="physical"]:checked').value
	var legumes = document.getElementById("risk-form").elements[14].value;

    height= height*0.01; //convert cm to m

    //calculate BMI
    var BMI = weight/(height*height)
    console.log(BMI)
	//evaluate
    var irPoints = 0;
    var htnPoints = 0;

    if(BMI<25){
        //nothing
    } else if(BMI<=30){
        irPoints+=9;
        htnPoints+=10;
    } else {
        irPoints+=19;
        htnPoints+=20;
    }

    if(sex=="female"){
        if(waist<80){
            //nothing
        } else if(waist<=88){
            irPoints+=3;
        } else{
            irPoints+=7;
        }
    } else { //sex:male
        irPoints+=2;
        htnPoints+=6;
        if(waist<94){
            //nothing
        } else if(waist<=102){
            irPoints+=3;
        } else{
            irPoints+=7;
        }
    }

    if(screen>=2){
       irPoints+=3;
    }

    if(breakfasts<5){
        irPoints+=3;
    }

    if(sugary>=1){
        irPoints+=2;
    }

    if(walking==0){
        irPoints+=2;
    }

    if(physical==0){
        irPoints+=2;
        htnPoints+=2;
    }

    if(getAge(birthDate)>=40){
        htnPoints+=2;
    }

    if(alcohol>=3){
        htnPoints+=2;
    }

    if(legumes<1){
        htnPoints+=8;
    }

	console.log(irPoints);
    console.log(htnPoints);

    //store in database

    var data = [{
			type: "height",
			metric: "cm",
			value: height,
	},
	{
    			type: "weight",
    			metric: "kg",
    			value: weight,
    	},
    	{
        			type: "ir_risk",
        			metric: "",
        			value: irPoints,
        	},
        	{
            			type: "htn_risk",
            			metric: "",
            			value: htnPoints,
            	},

	];
	console.log(data);
     console.log(JSON.stringify(data));
    fetch('http://localhost:3000/user/update/measurement/?username=me', {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	})
	.then((response) => response.json())
	.then((data) => {
		console.log('Success:', data);
	})
	.catch((error) => {
		console.error('Error:', error);
    });

}
