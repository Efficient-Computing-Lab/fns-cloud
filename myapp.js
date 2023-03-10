var express = require('express');
var app = express();
var cors = require('cors');
var fs = require('fs');
let formidable = require('formidable');
var session = require('express-session');
var hash = require('pbkdf2-password')()
var path = require('path');
var mongoose = require('mongoose');

const {
  User
} = require('./models/user')
const {
  Measures
} = require('./models/user')
const {
  Meals
} = require('./models/user')
const {
  Energy
} = require('./models/user')

app.port = 3000;

/* static path (css images etc) */
app.use(express.static('static'))
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// middleware
app.use(express.urlencoded({
  extended: false
}))

//Routes
var user = require('./myroutes');
var meal = require('./myroutes');


//Enable cors
app.use(cors());

app.use(session({
  resave: false, // don't save session if unmodified
  saveUninitialized: false, // don't create session until something stored
  secret: 'yeuh'
}));

//Node Config
app.use(express.json());

//Start the server on port 3000
app.listen(app.port);

function err_to_html(err) {
  return '<p class="msg error">' + err + '</p>';
}

/**** ENDPOINTS ****/

app.use(function(req, res, next) {
  var err = req.session.error;
  var msg = req.session.success;
  var status_msg = req.session.status_msg;
  delete req.session.error;
  delete req.session.success;
  delete req.session.status_msg;
  res.locals.message = '';
  res.locals.error_msg = '';
  res.locals.status_msg = '';
  res.locals.logout = '';
  res.locals.months = 0;
  res.locals.download = '';
  if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
  if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
  if (status_msg) res.locals.status_msg = status_msg;
  if (req.session.user) {
    req.session.status_msg = 'You are logged in as:<br> ' + req.session.user.credentials.username;
    res.locals.status_msg = req.session.status_msg;
    res.locals.logout = '<a href="/logout">Logout</a>';
  } else {
    req.session.status_msg = 'You are not logged in';
    res.locals.status_msg = req.session.status_msg;
  }
  next();
});


// Authenticate using our plain-object database of doom!

function authenticate(username, pass, fn) {
  if (!module.parent) console.log('authenticating %s:%s', username, pass);
  //  var user = users[name];
  // query the db for the given username
  // if (!user) return fn(new Error('cannot find user'));
  // apply the same algorithm to the POSTed password, applying
  // the hash against the pass / salt, if there is a match we
  // found the user

  User.findOne({ "credentials.username": username }, function(err, user) {
    if(user){
      console.log(err);
      hash({ password: pass, salt: user['credentials'].salt }, function (err, pass, salt, hash) {
        if (err) return fn(err);
        if (hash === user['credentials'].hash) return fn(null, user)
        fn(new Error('invalid password'));
      });
    } else {
      fn(err);
    }

  });
}

function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}

app.get('/restricted', restrict, function(req, res) {
  res.send('Wahoo! restricted area, click to <a href="/logout">logout</a>');
});


app.get('/logout', function(req, res) {
  // destroy the user's session to log them out
  // will be re-created next request
  req.session.destroy(function() {
    res.redirect('/');
  });
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/meals-error', function(req, res) {
  res.render('meals-error');
});

app.post('/login', async function(req, res) {
  authenticate(req.body.username, req.body.password, function(err, user) {
    if (user) {
      // Regenerate session when signing in
      // to prevent fixation
      req.session.user = user;
      req.session.success = 'Authenticated as ' + user.credentials.username +
          ' click to <a href="/logout">logout</a>. ' +
          ' You may now access <a href="/restricted">/restricted</a>.';
      req.session.regenerate(function() {
        // Store the user's primary key
        // in the session store to be retrieved,
        // or in this case the entire user object
        req.session.user = user;
       // req.session.success = 'Authenticated as ' + user.credentials.username +
       //   ' click to <a href="/logout">logout</a>. ' +
       //   ' You may now access <a href="/restricted">/restricted</a>.';
        //        res.redirect('back');
        res.redirect('/');
      });
    } else {
      req.session.error = 'False credentials, please try again!';
      res.redirect('/login');
    }
  });
});

/** TEST **/

app.get('/helper', function(req, res) {
  res.render('helper');
});

app.post('/helper', async function(req, res) {
  var meal = new Meals({
    calories: req.body.calories,
    type: req.body.type,
    option: req.body.option,
    name: req.body.name,
    ingredients: req.body.ingredients,
    preparation: req.body.preparation,
    category: req.body.category,
    cho: req.body.cho,
    protein: req.body.protein,
    fat: req.body.fat,
    energy: req.body.energy,
    image: req.body.img
  });
  var result = await meal.save(function(err) {
    if (!err) {
      return null;
    } else {
      return err;
    }
  });
  console.log("result=", result);
  if (result != null) {
    res.locals.err = result;
    console.log("meal inserted")
  } else {
    res.redirect('helper');
  }
});

app.get('/helper-energy', function(req, res) {
  res.render('helper-energy');
});

app.post('/helper-energy', async function(req, res) {
  var energy = new Energy({
    percent: req.body.percent,
    energy_def: req.body.ener_def,
    energy_exp: req.body.ener_exp,
    energy_in: req.body.ener_in
  });
  var result = await energy.save(function(err) {
    if (!err) {
      return null;
    } else {
      return err;
    }
  });
  console.log("result=", result);
  if (result != null) {
    res.locals.err = result;
    console.log("energies inserted")
  } else {
    res.redirect('helper-energy');
  }
});


/**********/

app.get('/signup', function(req, res) {
  res.render('signup');
});
app.post('/signup', async function(req, res) {
  var result;
  hash({ password: req.body.password }, async function (err, pass, salt, hash) {
    if (err) throw err;
    var user = new User({
      birth: new Date(),
      ethnicity: "",
      sex: "",
      measurement: [],           // store the salt & hash in db object
      credentials: {
        username: req.body.username,
        email: req.body.email,
        salt : salt,
        hash : hash
      }
    });
    result = await user.save(function(err) {
      if (!err) {
        return null;
      } else {
        return err;
      }
    });

  });

  console.log("result=", result);
  if (result != null) {
    res.locals.err = result;
    res.redirect('signup');
  } else {
    res.redirect('login');
  }
});

const isFileValid = (file) => {
  const type = file.mimetype.split("/").pop();
  const validTypes = ["pdf","csv"];
  if(validTypes.indexOf(type) == -1){
    return false;
  }
  return true;
};
//users
app.get('/users', user.allUsers); //retrieves all users
app.get('/db', meal.allMeals); //retrieves all users
app.get('/user', user.userById); //retrieves user by username
app.post('/user/add', user.createUser); //creates a user (signup)
app.put('/user/update/measurement', user.updateMeasurement); //update measurements
app.put('/user/update/risk', user.updateUserRisk); //update risk only
app.put('/user/update/personal', user.updateUserPersonal); //update height,weight etc only
app.delete('/user/delete', user.deleteUser); //delete user

// HTML views.

app.get('/risk', function(req, res) {
  res.render('risk');
});
app.post('/risk', function(req, res) {
  res.render('risk');
});
app.get('/risk-result', function(req, res) {
  res.render('risk-result');
});

app.get('/template.csv',async function(req, res) {
  _ = await fs.readFile(__dirname+'/template.csv', (err,data) => {
    if(err) throw err;
    res.status(200);
    res.setHeader('Content-Type', 'text/csv');
    res.write(data);
    res.send();
  });
});

app.get('/batch-mode',function(req, res) {
  res.render('batch-mode');
});
app.post('/batch-mode', async function(req, res) {

  let form = new formidable.IncomingForm();

  form.mutiples = false;

  form.uploadDir = path.join(__dirname,"uploads");

  console.log(form);
  //parse

  _ = await form.parse(req,(err,fields,files)=>{
    console.log("err = ", err, " files = ", files)
    if(err){
      throw 'Error parsing files';
    }
    const file = files.myFile;

    //check file if valid
    const isValid = isFileValid(file);

    //creates a valid name by removing spaces 
    const fileName =  encodeURIComponent(file.originalFilename.replace(/\s/g,'-'))
    console.log("Filename: "+fileName);
    if(!isValid){
      //throws error if file isn't valid
      res.locals.error_msg = '<br><div class="alert alert-warning">Please choose a .csv file and resubmit.</div>';

    }
    try {
      //stores the file in the directory
      fs.renameSync(file.path, path.join(form.uploadDir, fileName))
    } catch (err) {
      console.log(err)
    }
    console.log(form);

    let objects = csvHandler(fileName);
    console.log(objects);
    let csv = ''
    //Loop the array of objects
    for(let row = 0; row< objects.length; row++){
      let keysAmount = Object.keys(objects[row]).length
      let keysCounter = 0;

      //if this is the first row, then generate the headings
      if(row == 0){

        //Loop each property of the object
        for(let key in objects[row]){
          //This is to not add a comma at the last cell
          //The '\n' adds a new line
          csv += key + (keysCounter+1 < keysAmount ? ',' : '\r\n' )
          keysCounter++
        }
      } else {
        for(let key in objects[row]){
          csv += objects[row][key] + (keysCounter+1 < keysAmount ? ',' : '\r\n' )
          keysCounter++
        }
      }
      keysCounter = 0;
    }
    console.log("Csv out of loop: "+csv);
    //Loop done
    res.locals.download = "<a href='data:text/plain;charset=utf-8,"+ encodeURIComponent(csv)+"' download='output.csv'>Download Ready</a>"
    res.render('batch-mode');
  });
});

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

function bmi(height, weight) {
  //calculate BMI
  height = height / 100;  //convert to meters
  var BMI = weight / (height * height);
  return BMI;
}

function calculateRisks(data) {
  var sex = data.sex;
  var birthDate = data.birthdate;
  var height = parseInt(data.height);
  var weight = parseInt(data.weight);
  var waist = parseInt(data.waist);
  var screen = parseInt(data.screen);
  var breakfasts = parseInt(data.breakfasts);
  var sugary = parseInt(data.sugary);
  var alcohol = parseInt(data.alcohol);
  var walking = parseInt(data.walking);
  var physical = parseInt(data.physical);
  var legumes = parseInt(data.legumes);

  //height = height * 0.01; //convert cm to m
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

function testCalculateRisks() {
  function make_data(
    birthDate,
    sex,
    height,
    weight,
    waist,
    screen,
    breakfasts,
    sugary,
    alcohol,
    walking,
    physical,
    legumes) {
    return {
      birthDate: birthDate,
      height: height,
      weight: weight,
      sex: sex,
      waist: waist,
      screen: screen,
      breakfasts: breakfasts,
      sugary: sugary,
      alcohol: alcohol,
      walking: walking,
      physical: physical,
    }
  }
  var data = [
    make_data("1990-01-01", "female", 150, 150, 150, 5, 2, 2, 50, 1, 0, 0),
    make_data("1990-01-01", "male", 150, 150, 150, 5, 2, 2, 50, 1, 0, 0),
  ];
  var expected_results = [0, 0];

  data.forEach(body => {
    var [htnPoints, irPoints] = calculateRisks(body);
  });
}

app.post('/risk-result', async function(req, res) {
  //collect form data
  var sex = req.body.sex;
  var birthDate = req.body.birthdate;
  var height = req.body.height;
  var weight = req.body.weight;
  var waist = req.body.waist;
  var screen = req.body.screen;
  var breakfasts = req.body.breakfasts;
  var sugary = req.body.sugary;
  var alcohol = req.body.alcohol;
  var walking = req.body.walking;
  var physical = req.body.physical;
  var legumes = req.body.legumes;

  height = height * 0.01; //convert cm to m
  testCalculateRisks();
  var [htnPoints, irPoints] = calculateRisks(req.body);

  /* HTN: >=26 risk
   * IR:  30>=high risk>=23 , >=31 very high risk
   */
  //    console.log(irPoints);
  //    console.log(htnPoints);

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
  var measurements = data.map(el => new Measures({
    type: el.type,
    metric: el.metric,
    value: el.value,
  }));
  console.log(measurements);
  var prev_values = null;
  if (req.session.user) {
    var username = res.locals.username = req.session.user.credentials.username;
    User.updateOne({
      "credentials.username": username
    }, {
      $push: {
        measurement: measurements
      }
    }, function(err) {
      if (!err) {
        //return res.send({});
      } else {
        console.log(err);
        //return res.send(404, { error: "Person was not updated."});
        return new Error('cannot find user');
      }
    });
    await User.findOne({
      "credentials.username": username
    }, function(err, user) {
      if (!err) {
        prev_values = user.measurement;
        //store sex,birthday in db
        user.sex = sex;
        user.birth = new Date(birthDate);

        user.save(function(err){
          if(!err){
            console.log("Updated sex,birthday");
          } else {
            console.log(err);
            return new Error("User was not updated.");
          }
        });

      } else {
        console.log(err);
        //return res.send(404, { error: "Person was not updated."});
        return new Error('cannot find user');
      }
    });
  } else {
    req.session.error = 'You are not logged in.';
  }
  res.locals.history = "";
  if (prev_values) {
    var output = "<table class=\"table table-bordered\"><thead><tr><th>date</th><th>type</th><th>value</th></tr></thead><tbody>";

    var previous_ir_risk = recentType(prev_values, "ir_risk");
    var previous_htn_risk = recentType(prev_values, "htn_risk");
    if (previous_ir_risk) {
      var val = previous_ir_risk;
      output += "<tr><td>" + val.timestamp.toLocaleString() + "</td><td>" + val.type + "</td><td>" + val.value + "</td></tr>";
    }
    if (previous_htn_risk) {
      var val = previous_htn_risk;
      output += "<tr><td>" + val.timestamp.toLocaleString() + "</td><td>" + val.type + "</td><td>" + val.value + "</td></tr>";
    }
    /*
           prev_values.forEach(val => {
           if (val.type != "ir_risk" && val.type != "htn_risk") {
           return;
           }
           output += "<tr><td>"+val.timestamp+"</td><td>"+val.type+"</td><td>"+val.value+"</td></tr>";
           return;
           });
           */

    output += "</tbody></table>";
    res.locals.history = output;
  }

  const IR_RISK = "There is an increased risk of having insulin resistance. Insulin resistance is a prognostic indicator for the development of Diabetes Mellitus. To avoid the occurrence of Diabetes mellitus, it is important to increase your physical activity, lose weight and adopt healthy eating habits (Mediterranean diet, eating breakfast, avoiding sugary drinks, etc.). It is advisable to visit your doctor for further testing.";
  const IR_VRISK = "There is a very high risk of having insulin resistance. For this reason, it is necessary to contact your doctor and dietitian immediately. At the same time, you should modify your diet and physical activity as they will suggest.";
  const IR_NORM = "There is a small risk of having insulin resistance. Insulin resistance is a prognostic indicator for the occurrence of Diabetes mellitus. However, you should not forget that healthy diet and physical activity should be of great concern to you as they are the best shield in the prevention of diabetes.";
  const HTN_RISK = "You have an increased risk of having grade 2 or 3 hypertension and you should consult your doctor for advice. It is important to increase your physical activity (at least 30 minutes of moderate-intensity aerobic exercise, 5-7 times / week) and lose excess weight, as obesity is directly linked to the onset of hypertension. It would also be advisable to reduce the consumption of alcoholic beverages and salt. At the same time, you should increase the consumption of legumes, fruits and vegetables.";
  const HTN_NORM = "You have a low risk of having grade 2 or 3 hypertension. However, you should not forget that healthy diet and physical activity should be of great concern to everyone.";

  res.locals.htn = {
    "class": "success",
    "message": HTN_NORM,
    "score": htnPoints.toString(),
  }
  if (htnPoints >= 26) {
    res.locals.htn.class = "danger";
    res.locals.htn.message = HTN_RISK;
  }
  res.locals.ir = {
    "class": "success",
    "message": IR_NORM,
    "score": irPoints.toString(),
  }
  if (irPoints >= 23 && irPoints <= 31) {
    res.locals.ir.class = "warning"
    res.locals.ir.message = IR_RISK;
  } else if (irPoints > 31) {
    res.locals.ir.class = "danger";
    res.locals.ir.message = IR_VRISK;
  }


  res.render('risk-result');
});


app.get('/', function(req, res) {
  res.render('welcome-page');
});


function resetPersonalisedState(session) {
  var state = {
    step: 0,
    values: {},
  };

  session.personalisedState = state;
}

app.get('/personalized-rec', async function(req, res) {
  var initial_values = null;
  var data = req.body;
  resetPersonalisedState(req.session);

  if(req.session.error_msg){
    req.session.error_msg = res.locals.error_msg;
  }

  if (req.session.user) {
    var username = res.locals.username = req.session.user.credentials.username;
    _ = await User.findOne({
      "credentials.username": username
    }, function(err, user) {
      console.log("inner function");
      if (!err) {
        initial_values = {
          "sex": user.sex,
          "ethnicity": user.ethnicity,
          "birth": user.birth,
          "height": recentType(user.measurement, "height"),
          "weight": recentType(user.measurement, "weight"),
        }; 

      } else {
        console.log(err);
        //return res.send(404, { error: "Person was not updated."});
        return new Error('cannot find user');
      }
    });
  }
  console.log("res local err msg ", req.session.personalized_error);
  res.locals.error_msg = req.session.personalized_error;
  req.session.personalized_error = null;
  console.log("res local err m2sg ", res.locals.error_msg);
  res.locals.height = null;
  res.locals.height_date = null;
  res.locals.weight = null;
  res.locals.weight_date = null;
  res.locals.sex = null;
  res.locals.birth = null;
  res.locals.ethnicity = null;

  if(initial_values){
    if (initial_values.height && initial_values.weight) {
      res.locals.height = initial_values.height.value;
      res.locals.height_date = initial_values.height.timestamp.toLocaleDateString();
      res.locals.weight = initial_values.weight.value;
      res.locals.weight_date = initial_values.weight.timestamp.toLocaleDateString();
      res.locals.sex = initial_values.sex;
      // input type="date" needs an ISO string YYYY-MM-DD but toISOString() returns time as well, so get only the first 10 characters
      res.locals.birth = initial_values.birth.toISOString().slice(0, 10);
      res.locals.ethnicity = initial_values.ethnicity;
    }
  }

  console.log("sex", res.locals.sex);
  console.log("birth", res.locals.birth);
  console.log("ethn", res.locals.ethnicity);



  res.render('personalized-rec');
});

app.get('/energy-expenditure', function(req, res) {
  req.session.personalisedState.step -= 1;
  res.render('energy-expenditure');
});

app.post('/energy-expenditure', async function(req, res) {
  res.locals.error_msg = req.session.personalized_error;
  req.session.personalized_error = null;
  var data = req.body;
  console.log(req.session.personalisedState);
  if (!req.session.personalisedState || req.session.personalisedState.step != 0) {
    res.redirect('/personalized-rec');
    return;
  }
  // Validate form data.
  console.log(data);
  if (data.sex != "male" && data.sex != "female") {
    req.session.personalized_error = err_to_html('Please choose your sex and resubmit.');
    res.redirect('/personalized-rec');
    return;
  }

  if (data.ethnicities == "") {
    req.session.personalized_error = err_to_html('Please choose your ethnicity and resubmit.');
    res.redirect('/personalized-rec');
    return;

  }
  if (isNaN(parseInt(data['user-height'], 10))) {
    req.session.personalized_error = err_to_html('Please enter a valid height number value and resubmit.');
    res.redirect('/personalized-rec');
    return;
  }
  if (isNaN(parseInt(data['user-weight'], 10))) {
    req.session.personalized_error = err_to_html('Please enter a valid weight number value and resubmit.');
    res.redirect('/personalized-rec');
    return;
  }
  if (req.session.user) {
    var username = res.locals.username = req.session.user.credentials.username; 
    await User.findOne({
      "credentials.username": username
    }, function(err, user) {
      if (!err) {
        //store sex,birthday in db
        user.sex = data.sex;
        user.birth = new Date(data.birth);
        user.ethnicity = data['ethnicities'];
        user.save(function(err){
          if(!err){
            console.log("Updated sex,birthday");
          } else {
            console.log(err);
            return new Error("User was not updated.");
          }
        });

      } else {
        console.log(err);
        return new Error('cannot find user');
      }
    });
  }
  // Go to next step
  req.session.personalisedState.step += 1;

  //pass values to session state
  req.session.personalisedState.values.sex = data.sex;
  req.session.personalisedState.values.ethnicity = data.ethnicities;
  req.session.personalisedState.values.birth = data.birth;
  req.session.personalisedState.values.height = parseInt(data['user-height']);
  req.session.personalisedState.values.weight = parseInt(data['user-weight']);

  res.render('energy-expenditure');
});
app.post('/weight-loss-goal', function(req, res) {
  var data = req.body;
  res.locals.error_msg = req.session.personalized_error;
  req.session.personalized_error = null;
  console.log(data);
  if (!req.session.personalisedState || req.session.personalisedState.step != 1) {
    res.redirect('/personalized-rec');
    return;
  }

  req.session.personalisedState.step += 1;

  var state = req.session.personalisedState;

  state.values.totalSleepOnWeekdays = parseInt(data["weekday"]);
  state.values.totalSleepOnWeekend = parseInt(data["weekend"]);
  state.values.occupations = data.occupations;
  state.values.totalHoursOfWork = parseInt(data["totalHoursOfWork"]);
  state.values.trans = data.trans == 'Yes';
  if (state.values.trans) {
    state.values['walking-effort'] = data['walking-effort'];
    state.values['cycling-effort'] = data['cycling-effort'];
    state.values['hoursTravel'] = parseInt(data['hoursTravel']);
  } else {
    state.values['walking-effort'] = "none";
    state.values['cycling-effort'] = "none";
    state.values['hoursTravel'] = 0;

  }
  state.values['leisure-activity-1'] = data['leisure-activity-1'];
  state.values['leisure-activity-2'] = data['leisure-activity-2'];
  state.values['first-act-mins'] = parseInt(data['first-act-mins']);
  state.values['second-act-mins'] = parseInt(data['second-act-mins']);
  state.values['house-hold-work-1'] = data['house-hold-work-1'];
  state.values['house-hold-work-2'] = data['house-hold-work-2'];
  state.values['first-house-mins'] = parseInt(data['first-house-mins']);
  state.values['sec-house-mins'] = parseInt(data['sec-house-mins']);
  var BMI = bmi(state.values.height, state.values.weight);
  res.locals.bmi = BMI.toFixed(1);
  /*
   * ethnicities:
   *
     americanIndian
     alaskaNative
     asian
     black
     africanAmerican
     caucasian
     hispanic
     latino
     nativeHawaiian
     otherPacificIslander */
  var classification = null;

  var lower_body_weight_cut_off = 0;
  var height_meters = state.values.height / 100;
  var higher_body_weight_cut_off = 0;
  if (["americanIndian", "alaskaNative", "black", "africanAmerican", "caucasian", "hispanic", "latino", "nativeHawaiian"].includes(state.values.ethnicity)) {

    if (bmi < 18.5) {
      classification = "Underweight";
    } else if (bmi <= 24.9) {
      classification = "Normal weight";
    } else if (bmi <= 29.9) {
      classification = "Overweight";
    } else if (bmi <= 34.9) {
      classification = "Obese (Class I)";
    } else if (bmi <= 39.9) {
      classification = "Obese (Class II)";
    } else {
      classification = "Obese (Class III)";
    }
    lower_body_weight_cut_off = (height_meters * height_meters) * 20;
    higher_body_weight_cut_off = (height_meters * height_meters) * 24.9;
  } else {
    if (bmi < 18.5) {
      classification = "Underweight";
    } else if (bmi <= 22.9) {
      classification = "Normal weight";
    } else if (bmi <= 24.9) {
      classification = "Overweight";
    } else if (bmi <= 29.9) {
      classification = "Obese (Class I)";
    } else {
      classification = "Obese (Class II)";
    }
    lower_body_weight_cut_off = (height_meters * height_meters) * 18.5;
    higher_body_weight_cut_off = (height_meters * height_meters) * 22.9;
  }
  res.locals.lower = lower_body_weight_cut_off.toFixed(0);
  res.locals.higher = higher_body_weight_cut_off.toFixed(0);


  if (BMI < 35) {
    res.locals.message = "The recommended weight loss rate is between 2-4 kg per month or 0.5-1 kg per week. Nevertheless, keep in mind that by reducing your initial body weight by 5-10% you will achieve substantial benefits in terms of health, quality of life and disease prevention";
    res.locals.rate_min = 2;
    res.locals.rate_max = 4;

  } else {
    res.locals.message = "The recommended weight loss rate is between 4-6 kg per month or 1.0-1.5 kg per week. Nevertheless, keep in mind that by reducing your initial body weight by 5-10% you will achieve substantial benefits in terms of health, quality of life and disease prevention.";

    res.locals.rate_min = 4;
    res.locals.rate_max = 6;
  }
  res.locals.weight = state.values.weight;

  res.render('weight-loss-goal');
});
app.post('/weight-loss-rate', function(req, res) {
  var data = req.body;
  console.log(data);
  res.locals.error_msg = req.session.personalized_error;
  req.session.personalized_error = null;
  if (!req.session.personalisedState || req.session.personalisedState.step != 2) {
    res.redirect('/personalized-rec');
    return;
  }
  req.session.personalisedState.step += 1;

  req.session.personalisedState.values['weight-goal'] = parseInt(data['weight-goal']);
  req.session.personalisedState.values['weight-rate'] = parseInt(data['weight-rate']);

  //calculate number of months needed to reach goal
  var diff = req.session.personalisedState.values.weight - req.session.personalisedState.values['weight-goal'];
  var rate = req.session.personalisedState.values['weight-rate'];
  res.locals.months = diff / rate;


  res.render('weight-loss-rate');
});
app.post('/result-rec', function(req, res) {
  res.locals.error_msg = req.session.personalized_error;
  req.session.personalized_error = null;
  var data = req.body;
  console.log(data);
  if (!req.session.personalisedState || req.session.personalisedState.step != 3) {
    res.redirect('/personalized-rec');
    return;
  }
  req.session.personalisedState.step += 1;
  //store percentage
  req.session.personalisedState.values['percentage'] = parseInt(data['percentage']);

  res.render('result-rec');
});

app.post('/meal-plans', async function(req, res) {
  res.locals.error_msg = req.session.personalized_error;
  req.session.personalized_error = null;
  var data = req.body;
  console.log(data);
  if (!req.session.personalisedState || req.session.personalisedState.step != 4) {
    res.redirect('/personalized-rec');
    return;
  }
  req.session.personalisedState.step += 1;
  var state = req.session.personalisedState;

  state.values.answer = data.answer == 'Yes';
  if (state.values.answer) {
    if(Array.isArray(data.allergies)){
      state.values.allergy = [];
      for(let i=0; i<data.allergies.length; i++){
        state.values.allergy.push(data.allergies[i]);
      }
    } else {
      state.values.allergy = data.allergies;
    }
  } else {
    state.values.allergy = null;
  }

  req.session.personalisedState.values['leisure-activity'] = data['leisure-activity'];
  var user = req.session.personalisedState;

  var weight = user.values.weight;
  var height = user.values.height;
  var totalSleepOnWeekdays = user.values.totalSleepOnWeekdays;
  var totalSleepOnWeekend = user.values.totalSleepOnWeekend;
  var totalHoursOfWork = user.values.totalHoursOfWork;
  var hoursTravel = user.values['hoursTravel'];
  var firstActMins = user.values['first-act-mins'];
  var secondActMins = user.values['second-act-mins'];
  var firstHouseMins = user.values['first-house-mins'];
  var secondHouseMins = user.values['sec-house-mins'];
  var weightRate = user.values['weight-rate'];

  //Estimate RMR
  var rmr = calcRMR(weight, height, getAge(user.values.birth), user.values.sex);
  console.log("RMR= ", rmr);
  //Estimate PAL
  var pal = calcPAL(user.values.occupations, user.values.sex);
  console.log("PAL= ", pal);
  //Estimate MET
  var metCom = calcMETCom(user.values['walking-effort'], user.values['cycling-effort']);
  var metFirstAct = calcMETActiv(user.values['leisure-activity-1']);
  var metSecondAct = calcMETActiv(user.values['leisure-activity-2']);
  var metFirstHouse = calcMETHouse(user.values['house-hold-work-1']);
  var metSecondHouse = calcMETHouse(user.values['house-hold-work-2']);
  console.log("metCOM= ", metCom);
  console.log("metFirstAct= ", metFirstAct);
  console.log("metSecondAct= ", metSecondAct);
  console.log("metFirstHouse= ", metFirstHouse);
  console.log("metSecondHouse= ", metSecondHouse);

  //Estimate Total Energy Expenditure

  var tee = calcWeeklyTEE(weight, totalSleepOnWeekdays, totalSleepOnWeekend,
    totalHoursOfWork, hoursTravel, firstActMins, secondActMins,
    firstHouseMins, secondHouseMins, rmr, pal, metCom,
    metFirstAct, metSecondAct, metFirstHouse, metSecondHouse);
  console.log("TEE", tee);
  //store mean TEE to state values (daily tee)
  user.values.tee = tee / 7;

  //Estimate energy deficit from weight goal
  var deficit = calcEnergyDeficit(weightRate);

  console.log("Deficit", deficit);

  //Calculate EE(Energy Expenditure) and EI(Energy Intake) needed for weight loss using the percentage and cal deficit
  var stringPercentage = getStringPercentage(user.values['percentage']);
  console.log("percentage", stringPercentage);
  var energy = await Energy.findOne({
    percent: stringPercentage,
    energy_def: deficit
  }, function(err, ret) {
    if (!err) {
      return ret;
    } else {
      //req.session.error_msg = "Something  went wrong, please try filling in your details again."
      //console.log("could not find energy", err);
      //res.redirect("/personalized-rec");
      throw new Error(err);
//      return err;
    }
  });

  // if(energy == null){
  //    req.session.error_msg = "Something  went wrong, please try filling in your details again."
  //    res.redirect("/personalized-rec");
  //    return;
  //}

  //store EE and EI
  user.values['energy_exp'] = energy['energy_exp'];
  user.values['energy_in'] = energy['energy_in'];

  console.log("energy expenditure= ", energy['energy_exp']);
  console.log("energy intake= ", energy['energy_in']);

  //calculate user's calories for weight loss
  var userCal = user.values.tee - energy['energy_in'];
  var mealPlanCal = getMealPlanCalories(userCal);

  console.log("Meal plan calories= ", mealPlanCal);

  if (user.values.allergy == null) {
    res.locals.breakfasts = await Meals.find({
      calories: mealPlanCal,
      type: "breakfast"
    }, function(err, ret) {
      if (!err) {
        return ret;
      } else {
        console.log("could not find breakfasts", err);
        //res.render("/meals-error");
        return err;
      }
    });

    if(res.locals.breakfasts instanceof mongoose.Error || res.locals.breakfasts.length == 0) {
      res.redirect("/meals-error");
      return; 
    }

    res.locals.breakfasts.sort((a,b) => a.name.localeCompare(b.name));

    res.locals.lunches = await Meals.find({
      calories: mealPlanCal,
      type: "lunch"
    }, function(err, ret) {
      if (!err) {
        return ret;
      } else {
        console.log("could not find lunches", err);
        //res.render("/meals-error");
        return err;
      }
    });

    if(res.locals.lunches instanceof mongoose.Error || res.locals.lunches.length == 0) {
      res.redirect("/meals-error");
      return; 
    }

    res.locals.lunches.sort((a,b) => a.name.localeCompare(b.name));

    res.locals.dinners = await Meals.find({
      calories: mealPlanCal,
      type: "dinner"
    }, function(err, ret) {
      if (!err) {
        return ret;
      } else {
        console.log("could not find dinner", err);
        return err;
      }
    });

    if(res.locals.dinners instanceof mongoose.Error || res.locals.dinners.length == 0) {
      res.redirect("/meals-error");
      return; 
    }

    res.locals.dinners.sort((a,b) => a.name.localeCompare(b.name));

    res.locals.teas = await Meals.find({
      calories: mealPlanCal,
      type: "tea"
    }, function(err, ret) {
      if (!err) {
        return ret;
      } else {
        console.log("could not find tea", err);
        return err;
      }
    });

    if(res.locals.teas instanceof mongoose.Error || res.locals.teas.length == 0) {
      res.redirect("/meals-error");
      return; 
    }

    res.locals.teas.sort((a,b) => a.name.localeCompare(b.name));

  } else { //user has an allergy
    var breakfasts = await Meals.find({
      calories: mealPlanCal,
      type: "breakfast"
    }, function(err, ret) {
      if (!err) {
        return ret;
      } else {
        console.log("could not find breakfasts", err);
        return err;
      }
    });
    var array = [];
    for (let i = 0; i < breakfasts.length; i++) {
      var flag = true;
      console.log(breakfasts[i])
      if(Array.isArray(user.values.allergy)){
        console.log(user.values.allergy);
        for (let j = 0; j < user.values.allergy.length; j++) {
          if (flag && (breakfasts[i].category).includes(user.values.allergy[j])) {
            flag = true;
          } else {
            flag = false;
          }
          console.log(user.values.allergy[j]);
        }
      } else {
        if( (breakfasts[i].category).includes(user.values.allergy)){
          flag = true;
        } else {
          flag = false;
        }
      }
      if (flag) {
        array.push(breakfasts[i]);
        console.log("YES");
      }
    }

    res.locals.breakfasts = array;

    if(res.locals.breakfasts.length==0){
      res.redirect("/meals-error");
      return;
    }

    res.locals.breakfasts.sort((a,b) => a.name.localeCompare(b.name));

    var lunches = await Meals.find({
      calories: mealPlanCal,
      type: "lunch"
    }, function(err, ret) {
      if (!err) {
        return ret;
      } else {
        console.log("could not find lunches", err);
        return err;
      }
    });
    var array = [];
    for (let i = 0; i < lunches.length; i++) {
      var flag = true;
      if(Array.isArray(user.values.allergy)){
        console.log(user.values.allergy);
        for (let j = 0; j < user.values.allergy.length; j++) {
          if (flag && (lunches[i].category).includes(user.values.allergy[j])) {
            flag = true;
          } else {
            flag = false;
          }
          console.log(user.values.allergy[j]);
        }
      } else {
        if( (lunches[i].category).includes(user.values.allergy)){
          flag = true;
        } else {
          flag = false;
        }
      }

      if (flag) {
        array.push(lunches[i]);
      }
    }

    res.locals.lunches = array;

    if(res.locals.lunches.length==0){
      res.redirect("/meals-error");
      return;
    }

    res.locals.lunches.sort((a,b) => a.name.localeCompare(b.name));

    var dinners = await Meals.find({
      calories: mealPlanCal,
      type: "dinner"
    }, function(err, ret) {
      if (!err) {
        return ret;
      } else {
        console.log("could not find dinners", err);
        return err;
      }
    });
    var array = [];
    for (let i = 0; i < dinners.length; i++) {
      var flag = true;
      if(Array.isArray(user.values.allergy)){
        console.log(user.values.allergy);
        for (let j = 0; j < user.values.allergy.length; j++) {
          if (flag && (dinners[i].category).includes(user.values.allergy[j])) {
            flag = true;
          } else {
            flag = false;
          }
          console.log(user.values.allergy[j]);
        }
      } else {
        if( (dinners[i].category).includes(user.values.allergy)){
          flag = true;
        } else {
          flag = false;
        }
      }


      if (flag) {
        array.push(dinners[i]);
      }
    }
    res.locals.dinners = array;

    if(res.locals.dinners.length==0){
      res.redirect("/meals-error");
      return;
    }

    res.locals.dinners.sort((a,b) => a.name.localeCompare(b.name));

    var teas = await Meals.find({
      calories: mealPlanCal,
      type: "tea"
    }, function(err, ret) {
      if (!err) {
        return ret;
      } else {
        console.log("could not find teas", err);
        return err;
      }
    });
    var array = [];
    for (let i = 0; i < teas.length; i++) {
      var flag = true;
      if(Array.isArray(user.values.allergy)){
        console.log(user.values.allergy);
        for (let j = 0; j < user.values.allergy.length; j++) {
          if (flag && (teas[i].category).includes(user.values.allergy[j])) {
            flag = true;
          } else {
            flag = false;
          }
          console.log(user.values.allergy[j]);
        }
      } else {
        if( (teas[i].category).includes(user.values.allergy)){
          flag = true;
        } else {
          flag = false;
        }
      }

      if (flag) {
        array.push(teas[i]);
      }
    }
    res.locals.teas = array;

    if(res.locals.teas.length==0){
      res.redirect("/meals-error");
      return;
    }

    res.locals.teas.sort((a,b) => a.name.localeCompare(b.name));

  }

  res.render('meal-plans');
});

app.post('/output-result-rec', async function(req, res) {
  var data = req.body;
  console.log(data);
  var user = req.session.personalisedState;

  user.values.breakfast = data['breakfasts'];
  user.values.lunch = data['lunches'];
  user.values.dinner = data['dinners'];
  user.values.tea = data['teas'];

  res.locals.breakfast = await Meals.findOne({
    _id: user.values.breakfast
  }, function(err, ret) {
    if (!err) {
      return ret;
    } else {
      console.log("could not find breakfast", err);
      return err;
    }
  });
  res.locals.lunch = await Meals.findOne({
    _id: user.values.lunch
  }, function(err, ret) {
    if (!err) {
      return ret;
    } else {
      console.log("could not find lunch", err);
      return err;
    }
  });
  res.locals.dinner = await Meals.findOne({
    _id: user.values.dinner
  }, function(err, ret) {
    if (!err) {
      return ret;
    } else {
      console.log("could not find dinner", err);
      return err;
    }
  });
  res.locals.tea = await Meals.findOne({
    _id: user.values.tea
  }, function(err, ret) {
    if (!err) {
      return ret;
    } else {
      console.log("could not find tea", err);
      return err;
    }
  });
  res.locals.activity = data['leisure-activity'];
  res.locals['activity_mins'] = getActivityDuration(data['leisure-activity'], user.values['energy_exp'], user.values.weight);

  /* Reset state after it's not needed anymore. */
  resetPersonalisedState(req.session);
  res.render('output-result-rec');
});

app.get('/account-info', restrict, async function(req, res) {
  var username = res.locals.username = req.session.user.credentials.username;
  var prev_values = null;
  var userInfo = null;
  _ = await User.findOne({
    "credentials.username": username
  }, function(err, user) {
    if (!err) {
      prev_values = user.measurement;
      userInfo = user;
    } else {
      console.log(err);
      //return res.send(404, { error: "Person was not updated."});
      return new Error('cannot find user');
    }
  });
  res.locals.info = "";
  //Create table for account info
  if (userInfo) {
    var output = "<table class=\"table table-bordered\"><thead><tr><th>Email</th><th>Sex</th><th>Ethnicity</th><th>Birthday Date</th></tr></thead><tbody>";

    output += "<tr><td>" + userInfo['credentials'].email + "</td><td>" + userInfo.sex + "</td><td>" + userInfo.ethnicity + "</td><td>" + userInfo.birth + "</td></tr>";


    output += "</tbody></table>";
    res.locals.info = output;
  }

  res.locals.history = "";
  if (prev_values) {
    var output = "<table class=\"table table-bordered\"><thead><tr><th>date</th><th>type</th><th>value</th></tr></thead><tbody>";

    prev_values.forEach(val => {
      output += "<tr><td>" + val.timestamp + "</td><td>" + val.type + "</td><td>" + val.value + "</td></tr>";
      return;
    });

    output += "</tbody></table>";
    res.locals.history = output;
  }

  res.render('account-info');
});

app.get('/account-info/delete-data', restrict, async function(req, res) {
  var username = res.locals.username = req.session.user.credentials.username;
  var result = await User.findOne({
    "credentials.username": username
  }, async function(err, user) {
    if (!err) {
      user.measurement = null;
      user.sex = "";
      user.ethnicity = "";
      user.birth = new Date();
      return await user.save(function(err) {
        if (!err) {
          return null;
        } else {
          console.log(err);
          return err.toString();
        }
      });
    } else {
      console.log(err);
      return err.toString();
    }
  });
  if (result != null) {
    req.session.error = result;
  }
  res.redirect('/account-info');
});
app.get('/account-info/delete-user', restrict, async function(req, res) {
  var username = res.locals.username = req.session.user.credentials.username;
  await User.findOne({
    "credentials.username": username
  }, async function(err, user) {
    return user.remove(function(err) {
      if (!err) {
        console.log("removed");
      } else {
        return res.send(err);
      }
    });
  });
  req.session.destroy(function() {
    res.redirect('/');
  });
});

console.log('Server started on port ' + app.port)


function calcRMR(weight, height, age, sex) {
  if (sex == 'male') {
    return (9.99 * weight) + (6.25 * height) - (4.92 * age) + 5;
  } else if (sex == 'female') {
    return (9.99 * weight) + (6.25 * height) - (4.92 * age) - 161;
  } else {
    throw "invalid sex " + sex;
  }
}


function calcEESleep(rmr, totalHoursOfSleep) {
  return (rmr / 24) * totalHoursOfSleep;
}



function calcEEWork(rmr, pal, totalHoursOfWork) {
  return (rmr / 24) * pal * totalHoursOfWork;
}

function calcEECommuting(met, weight, totalMinutes) {
  return met * weight * (totalMinutes / 60.0);
}

function calcEEActivity(met, weight, totalMinutes) {
  return calcEECommuting(met, weight, totalMinutes);
}

function calcEEHousehold(met, weight, totalMinutes) {
  return calcEECommuting(met, weight, totalMinutes);
}


function calcWeeklyTEE(weight, totalSleepOnWeekdays, totalSleepOnWeekend, totalHoursWork, totalMinutesCommute, minsFirstAct, minsSecAct, minsFirstHouse, minsSecHouse, rmr, pal, metCom, metFirstAct, metSecondAct, metFirstHouse, metSecondHouse) {

  var total =
    (totalSleepOnWeekdays * 5 + totalSleepOnWeekend * 2) +
    totalHoursWork +
    (totalMinutesCommute +
      minsFirstAct + minsSecAct +
      minsFirstHouse + minsSecHouse) / 60;

  var base = calcEESleep(rmr, totalSleepOnWeekdays) * 5 +
    calcEESleep(rmr, totalSleepOnWeekend) * 2 +
    calcEEWork(rmr, pal, totalHoursWork) +
    calcEECommuting(metCom, weight, totalMinutesCommute) +
    calcEEActivity(metFirstAct, weight, minsFirstAct) +
    calcEEActivity(metSecondAct, weight, minsSecAct) +
    calcEEHousehold(metFirstHouse, weight, minsFirstHouse); +
    calcEEHousehold(metSecondHouse, weight, minsSecHouse);

  if (total == 168) {
    return base;
  } else if (total < 168) {
    return base + ((1.0 * weight) * (168 - total));
  } else {
    throw "total hours more than 168" + total;
  }
}

function calcPAL(occupation, sex) {
  var pal;
  if (occupation.match(/^(technician|information|healthDiag|executive|art|personal|management|teacher|protective|engineer|miscAdmn|otherProf|records|secretary)$/)) {
    pal = 1.4;
  } else if (occupation.match(/^(supervisor|fabricator|otherTrans|private|vehicle|material|cook|miscFood|extractive|laborerNotConstr|sales|healthServ|salesReps)$/)) {
    if (sex == 'male') {
      pal = 1.6;
    } else {
      pal = 1.5;
    }
  } else if (occupation.match(/^(farm|otherHelp|constrLaborer|agricult|cleaning|constrTrade|freight|farmOp|textile|machine|waitress|otherMech|motor)$/)) {
    if (sex == 'male') {
      pal = 1.7;
    } else {
      pal = 1.5;
    }
  } else {
    throw 'error in occupation';
  }
  return pal;
}

function calcMETCom(walkingEffort, cyclingEffort) {
  var met = 0;

  //walking
  if (walkingEffort == 'light') {
    met = 3.3;
  } else if (walkingEffort = 'moderate') {
    met = 3.6;
  } else if (walkingEffort = 'vigorous') {
    met = 4;
  } else if (walkingEffort = 'none') {
    //nothing
  } else {
    throw 'error in commuting - invalid walking effort';
  }
  //cycling
  if (cyclingEffort == 'light') {
    met += 4.0;
  } else if (cyclingEffort == 'moderate') {
    met += 7.0;
  } else if (cyclingEffort == 'vigorous') {
    met += 11.0;
  } else if (cyclingEffort == 'none') {
    //nothing
  } else {
    throw 'error in commuting - invalid cycling effort';
  }
  return met;
}

function calcMETActiv(activity) {
  var met;
  if (['bowling', 'archery', 'billiards', 'darts', 'golf', 'frisbee', 'yoga'].includes(activity)) {
    met = 2.5;
  } else if (['ballet', 'bicycleLight', 'canoeLight', 'cricket', 'horse', 'sBallOff', 'surf', 'volley', 'walkLight', 'walkingDog', 'weighLight'].includes(activity)) {
    met = 4.0;
  } else if (['aerobic', 'basketball', 'bicycleMod', 'canoeMod', 'jogMod', 'kayak', 'netball', 'skiiLight', 'soccer', 'sBallPitch', 'swimLight', 'tennis', 'weighVig'].includes(activity)) {
    met = 6.0;
  } else if (['basket', 'beach', 'boxing', 'hockey', 'netball', 'runMod', 'skiiVig', 'skipping', 'volleyComp'].includes(activity)) {
    met = 8.0;
  } else if (['bicycleVig', 'canoeVig', 'rugby', 'runVig', 'soccerComp', 'squash', 'swimVig', 'polo'].includes(activity)) {
    met = 10.0;
  } else {
    throw 'error in leisure activity';
  }
  return met;
}

function calcMETHouse(activity) {
  var met;
  if (activity.match(/^(cooking|dusting|ironing|bed|watering|washing)$/)) {
    met = 2.5;
  } else if (activity.match(/^(gardening|mopping|sweep|vacuum)$/)) {
    met = 4.0;
  } else {
    throw 'error in household activity';
  }
  return met;
}

function calcEnergyDeficit(goal) {
  var deficit = 0;
  if (goal == 2) {
    deficit = 500;
  } else if (goal == 3) {
    deficit = 700;
  } else if (goal == 4) {
    deficit = 1000;
  } else if (goal == 5) {
    deficit = 1200;
  } else if (goal == 6) {
    deficit = 1400;
  } else {
    throw 'goal out of bounds';
  }
  return deficit;
}

function calcMealPlanCalories(tee, deficit) {
  return tee - deficit;
}

function getStringPercentage(percentage) { //input: percentage e.g. 51 - output: '50/50'
  if (percentage <= 20) {
    return '20/80';
  } else if ((percentage > 20) && (percentage <= 30)) {
    return '30/70';
  } else if ((percentage > 30) && (percentage <= 40)) {
    return '40/60';
  } else if ((percentage > 40) && (percentage <= 50)) {
    return '50/50';
  } else if ((percentage > 50) && (percentage <= 60)) {
    return '60/40';
  } else if ((percentage > 60) && (percentage <= 70)) {
    return '70/30';
  } else if (percentage > 70) {
    return '80/20';
  }
}

function getMealPlanCalories(userCal) {
  if (userCal <= 1100) {
    return 1000;
  } else if (userCal <= 1300) {
    return 1200;
  } else if (userCal <= 1500) {
    return 1400;
  } else if (userCal <= 1700) {
    return 1600;
  } else if (userCal <= 1900) {
    return 1800;
  } else if (userCal <= 2100) {
    return 2000;
  } else if (userCal <= 2300) {
    return 2200;
  } else if (userCal <= 2500) {
    return 2400;
  } else {
    throw 'error in calories'
  }
}

function getActivityDuration(activity, ee, weight) {

  if (['bowling', 'archery', 'billiards', 'darts', 'golf', 'frisbee', 'yoga', 'ballet', 'bicycleLight', 'canoeLight', 'cricket', 'horse', 'sBallOff', 'surf', 'volley', 'walkLight', 'dog', 'weighLight'].includes(activity)) {
    return (((60 * ee) / (4.0 * weight)) * 7).toFixed(1);
  } else if (['aerobic', 'basketball', 'bicycleMod', 'canoeMod', 'jogMod', 'kayak', 'netball', 'skiiLight', 'soccer', 'sBallPitch', 'swimLight', 'tennis', 'weighVig'].includes(activity)) {
    return (((60 * ee) / (6.0 * weight)) * 7).toFixed(1);
  } else if (['basket', 'beach', 'boxing', 'hockey', 'netball', 'runMod', 'skiiVig', 'skipping', 'volleyComp', 'bicycleVig', 'canoeVig', 'rugby', 'runVig', 'soccerComp', 'squash', 'swimVig', 'polo'].includes(activity)) {
    return (((60 * ee) / (8.0 * weight)) * 7).toFixed(1);
  } else {
    throw 'error in finding PA duration';
  }

}

function csvHandler(filename) {

  let data = fs.readFileSync(filename, 'utf8');

  //convert and store csv data into a buffer
  bufferString = data.toString();

  //store data for each individual person in an array index.
  arr = bufferString.split('\n');

  let jsonObj = [];
  let headers = arr[0].split(',');

  for (i = 0; i < arr.length; i++) {
    data = arr[i].split(',');
    let obj = {};
    for (let j = 0; j < data.length; j++) {
      obj[headers[j].trim()] = data[j].trim();
    }
    jsonObj.push(obj);
  }

  //JSON.stringify(jsonObj);
  /***
    We will first calculate the risks for each object in array jsonObj
    Then we will append the risks to another array along with the names 
   ***/

  let output = [];
  for(j=1; j< (jsonObj.length - 1); j++){
    //console.log(jsonObj[j]);
    jsonObj[j].birthDate = new Date(jsonObj[j].birthDate);
    let [htnRisk,irRisk] = calculateRisks(jsonObj[j]);
    let temp = {
      name : jsonObj[j].name,
      ir_risk: irRisk,
      htn_risk: htnRisk
    }
    output.push(temp);

  }
  return output;
}

//returns the most recent added object of the array
function recentType(a, type) { //a:array type:string

  if (a == null) {
    return null;
  }
  if (a.length == 0) {
    return null;
  }
  var result = {
    type: "",
    metric: "",
    timestamp: 0
  };

  for (i = 0; i < a.length; i++) {
    if (a[i].type == type) {
      tmp2 = new Date(result.timestamp);
      let tmp1 = new Date(a[i].timestamp);
      if (tmp1.getTime() > tmp2.getTime()) {
        result = a[i];
      }
    }
  }
  return result;
}


