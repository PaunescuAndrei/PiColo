var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');
var crypto = require('crypto');
var formidable = require('formidable');

var con = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'picolo_db'
});

var selectUsrPwd = 'select * from users where username = ? and password = ?';
var selectUsr = 'select * from users where username = ?';
var insertUsrPwd = 'insert into users (username, password) VALUES ?';

var app = module.exports = express();
app.use(session({
    secret: 'mysupersecretsecret',
    resave: true,
    saveUninitialized: true
}));

app.use("/", express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());


app.post('/auth', function(request, response){
    
    new formidable.IncomingForm().parse(request, (err, fields, files) => {
        if (err) {
            console.error('Error', err)
            response.sendStatus(400);
        } else {
            var username = fields.username;
            var password = fields.password;
            var button = fields.button;
            
            if(username && password){
                const hash = crypto.createHash('sha256').update(password);
                password = hash.digest('base64');
                hash.destroy();
                
                if(button == 'login'){ // Login
                    con.query(selectUsrPwd, [username, password], function(err, result, field){
                        if(result.length > 0) {
                            request.session.loggedin = true;
                            request.session.username = username;
                            request.session.user_id = result[0].id;
                            response.sendStatus(200);
                        }else {
                            response.sendStatus(401);
                        }			
                    });
                } else { // Register
                    const values = [
                        [username, password]
                    ];
                    con.query(selectUsr, [username], function(err, result, field){
                        if(result.length > 0){
                            response.sendStatus(400);
                        } else {
                            con.query(insertUsrPwd, [values], function(err, result, field){
                                if(err){
                                    response.sendStatus(500);
                                }
                            });
                        }
                    });
                }
            }
        }
    });
});

app.get('/dashboard', function(request, response){
    if (request.session.loggedin) {
        response.sendFile(__dirname + "/public/dashboard.html");
	} else {
        response.sendFile(__dirname + "/public/logintoview.html");
	}
});


app.get('/dberror', function(request, response){
    if (request.session.loggedin) {
        response.sendFile(__dirname + "/public/dashboard.html");
	} else {
        response.sendFile(__dirname + "/public/loginerror.html");
	}
});

// Make storage based on user / sw
var multer  = require('multer')
const storage = multer.diskStorage({
    destination: 'uploads',
    filename: function (req, file, callback) {
        crypto.pseudoRandomBytes(16, function(err, raw) {
            if (err) return callback(err);
            callback(null, raw.toString('hex') + path.extname(file.originalname));
        });
    }
});
var upload = multer({ storage: storage });
app.post('/setParams', upload.single('watermark'), function(request, response, next){
    const file = request.file;
    console.log(file);
    console.log(request.body);
    response.send("salut");
});

app.get('/logout', function(request, response){
    console.log(request.body);
    request.session.destroy();
    response.redirect('/');
});

app.get('/', function(request, response){
    if(request.session.loggedin){
        response.redirect('/dashboard');
    } else {
        response.sendFile(__dirname + "/public/login.html");
    }
});

app.get('*', function(request, response){
    response.sendFile(__dirname + "/public/404.html", 404);
});

app.listen(7777);