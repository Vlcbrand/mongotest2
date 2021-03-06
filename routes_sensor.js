const express = require('express');
const router = express.Router();

const AES = require('crypto-js/AES');
const SHA256 = require('crypto-js/sha256');

//init mongoose & models
const mongoose = require('mongoose');

require('./models/sensordata');
var Sensormodel = mongoose.model('Sensor');

require('./models/users');
var UserModel = mongoose.model('Users');

require('./models/Log');
var LogModel = mongoose.model('Log');

//init MQTT
const mqtt = require('mqtt');
const mqttTopic = require('./config.json').mqttTopic;
const mqttBroker = require('./config.json').mqttBroker;
//connect to MQTT broker an subscribe on topic
const mqttClient = mqtt.connect(mqttBroker);
mqttClient.subscribe(mqttTopic);

//receive MQTT data and put it in the database
// mqttClient.on('message', function (topic, message) {
//
//     var newData = new Sensormodel({
//     });
//
//     newData.save(function (err, data) {
//         if (err) console.log(err);
//         else
//             console.log('Saved : ', data );
//     });
// });


//
router.all('*', (req, res, next) => {
    next();
});

//test for parameters in URL *works*
router.get('/getBetweenDates/:time1/:time2/:hours',function (req, res) {
    var data;
    var increment = req.params.hours / 5;

    Sensormodel.find({"timestamp": {$gt: new Date(req.params.time1), $lt:  new Date(req.params.time2)}}, async function (err, response) {
        data = response;
        var beginDate = req.params.time1;
        var test = await calculateDataFromTimestamp(beginDate, increment*1.25, async function(test) {
            var testv2 = await calculateDataFromTimestamp(beginDate, increment*2.5, async function(test2) {
                var testv3 = await calculateDataFromTimestamp(beginDate, increment*3.75, async function(test3) {
                    var testv4 = await calculateDataFromTimestamp(beginDate, increment*5, async function(test4) {
                        res.json({
                            response: [{
                                'name': 'Meterkast',
                                'series': [{
                                'name': data[0].timestamp,
                                'value': 0,
                            }, {
                                'name': data[test].timestamp,
                                'value': test/10000,
                            }, {
                                'name': data[test2].timestamp,
                                'value': (test2)/10000,
                            }, {
                                'name': data[test3].timestamp,
                                'value': (test3)/10000,
                            }, {
                                'name': data[data.length-1].timestamp,
                                'value': data.length/10000
                            }]
                            }]
                        });
                    })
                })
            })
        })
    });
});

async function calculateDataFromTimestamp(oldDate, increment, fn){
    let newDate = new Date(oldDate)
    newDate.setHours(newDate.getHours()+increment)
    let minutes = increment % 1;
    newDate.setMinutes(minutes *60);

    var data;

     await Sensormodel.find({"timestamp":{$gt:new Date(oldDate), $lt:new Date(newDate)}},async function (err, response) {
        data = response
        fn(data.length)
    });
}

router.get('/testEncrypt/:message1/:message2',function (req, res) {
    var a = SHA256(req.params.message1).toString();
    var b = SHA256(req.params.message2).toString();

    res.json({a:a, b:b})

});

router.get('/getLast12Hours', function (req,res) {
    Sensormodel.find({"timestamp":{$gt:new Date(Date.now() - 24*60*60 * 1000)}}, function (err, response) {
        res.json(({response:response}));
    })
});


router.get('/getAllSensorData',function (req, res) {
    Sensormodel.find({},function (err, response) {
        res.json(({response:response}));
    });
});

//
router.get('/getUsers', (req, res) => {
    UserModel.find({},function (err, a) {
        res.json({data:a});
    })

});

router.get('/message', (req, res) => {
    res.json({test: "test"});
});

router.get('/getUser/:username/:password', function (req,res) {
    const user =  UserModel.find({'Name':req.params.username, 'Password':SHA256(req.params.password).toString()},function (err,docs) {
        if(docs.length == 0)
            res.json({response: {role: 'no right credentials'}})
        else if(req.params.username == 'superadmin') {
            res.json({response: {role: 'admin'}});
        }
        else {
            const log = new LogModel({name: req.params.username})
            log.save()
            res.json({response: {role: 'user'}});
        }
    }).lean()
})

router.post('/newUser',function (req, res) {
    UserModel.find({'Name':req.body.username}, function (err, docs) {
        if(docs.length > 0){
            res.json({response: {saved: 'unsuccessfully'}});
        } else {
            newUser = new UserModel({Name:req.body.username, Password: SHA256(req.body.password).toString()});
            newUser.save(function (err, data) {
                if (err) console.log(err);
                else{
                    console.log('Saved : ', data );
                    res.json({response:{saved:'successfully'}})
                }
            });
        }
    })
})

router.get('/getLogs',function (req,res) {
    LogModel.find({},function (err, response) {
        res.json({response:response})
    })
})

/**
 * catch all
 */
router.all('*', (req, res) => {
    res.status(500);
    res.json({});
});

module.exports = router;
