var mongoose = require('mongoose')
const {User} = require('./models/user')
const {Measures} = require('./models/user')
const {Meals} = require('./models/user')
//Database
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: true,
    autoIndex: false,
    poolsize:10,
    serverSelectionTimeoutMS:5000,
    socketTimeoutMS: 5000,
    family: 4
}


//mongoose.connect('mongodb+srv://dbAdmin:vxehBqI62moHAW9i@cluster0.ow9fl.mongodb.net/diabetes_web?retryWrites=true&w=majority', options)
//mongoose.connect('mongodb://127.0.0.1/diabetes_web?retryWrites=true&w=majority', options)
mongoose.connect('mongodb://mongo:27017/diabetes_web?retryWrites=true&w=majority', options)

//Return all users
exports.allUsers = function(req, res){
    return User.find(function (err, user) {
        if (!err) {
            return res.send(user);
        } else {
            return res.send(err);
        }
    });
}

exports.allMeals = function(req, res){
    return Meals.find(function (err, meal) {
        if (!err) {
            return res.send(meal);
        } else {
            return res.send(err);
        }
    });
}

//Create user
exports.createUser = function(req, res){
    var user = new User({
        birth: new Date(),
        ethnicity:"",
        sex:"",
        measurement:null,
        credentials:{
            username:req.body.username,
            password:req.body.password,
            email: req.body.email
        }
    });
    user.save(function(err){
        if(!err){
            return console.log("created");
        } else {
            return res.send(err);
        }
    });
    return res.send(user);
}

//Return user by id
exports.userById = function(req,res){
    console.log("userById", req.query.username);
    return User.findOne({"credentials.username": req.query.username}, function (err, user) {
        if(!err) {
            if (user) {
            return res.send(user);
            } else {
                return res.status(404).send({error: "User not found."});
            }
        } else {
            return res.send(err);
        }
    });
}

//Return most recent measurment 
//exports.getMeasurement = function(req,res){
//      return User.find({"credentials.username":req.query.username,'measurement.type': {$eq: req.query.type }}
//}

//Delete a user by id
exports.deleteUser = function (req,res){
    return User.findOne({"credentials.username": req.query.username},function (err, user) {
        return user.remove(function (err){
            if(!err){
                console.log("removed");
            } else{
                return res.send(err);
            }
        });
    });
}

//Update user by id
exports.updateMeasurement = function(req,res){
    var measurements = req.body.map(el => new Measures({
        type: el.type,
        metric: el.metric,
        value: el.value,
    }));

    User.updateOne({"credentials.username": req.query.username}, {$push: {measurement: measurements}}, function(err) {
        if(!err){
            return res.send({});
        }else{
            console.log(err);
            return res.send(404, { error: "Person was not updated."});
        }
    });
}

//Set (Update) user's sex,ethnicity and birth date
exports.updateUserPersonal = function(req,res){
    User.findOne({"credentials.username":req.query.username},function(err,user){
        if(!err){
            //Do work
            user.ethnicity = req.body.ethnicity;
            user.sex = req.body.sex;
            user.birth = new Date(req.body.birth);

            user.save(function(err){
                if(!err){
                    return res.send("updated");
                }else{
                    console.log(err);
                    return res.send(404,{error: "User was not updated."});
                }
            });

        } else {
            console.log(err);
            return res.send(404, { error: "User could not be found."});
        }
    });
}

//Set (update) users sex and birth date
exports.updateUserRisk = function(req,res){
    User.findOne({"credentials.username":req.query.username},function(err,user){
        if(!err){
            //Do work
            user.sex = req.body.sex;
            user.birth = req.body.birth;

            user.save(function(err){
                if(!err){
                    return res.send("updated");
                }else{
                    console.log(err);
                    return res.send(404,{error: "User was not updated."});
                }
            });

        } else {
            console.log(err);
            return res.send(404, { error: "User could not be found."});
        }
    });

}
