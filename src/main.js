var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');
var crypto = require('crypto');
var formidable = require('formidable');
const compression = require('compression');
const cors = require('cors');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs')


var con = mysql.createConnection({
	host     : 'localhost',
    user     : 'root',
    port     : '3308',
	password : '',
	database : 'picolo_db'
});

var selectUsrPwd = 'select * from users where username = ? and password = ?';
var selectUsr = 'select * from users where username = ?';
var insertUsrPwd = 'insert into users (username, password) VALUES ?';

var app = module.exports = express();

app.use(compression());
app.use(cors());
app.options('*', cors());

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

function get_sw_data(userid,swid) {
	return new Promise((resolve, reject) => {
	  con.query(
		"select * from scripts where user_id = ? and id = ?",
		[userid, swid],
		(err, result) => {
		  return err ? reject(err) : resolve(result[0]);
		}
	  );
	});
}

function check_if_exists(swid,url){
	return new Promise((resolve, reject) => {
		con.query(
		  "select compressed_image from images where script_id = ? and image_link = ?",
		  [swid,url],
		  (err, result) => {
			if (err){
				reject(err)
			}else{
				if(result.length > 0){
					resolve(result[0].compressed_image);
				}
				resolve(null);
			};
		  }
		);
	  });
}

function add_image(userid,swid,url,name){
	return new Promise((resolve, reject) => {
		con.query(
		  "insert into images (user_id,script_id,image_link,compressed_image) VALUES ?",
		  [[[parseInt(userid),parseInt(swid),url,name]]],
		  (err, result) => {
			return err ? reject(err) : resolve(1);
		  }
		);
	  });
}

function add_sw(userid,watermark,lossy,quality){
	return new Promise((resolve, reject) => {
		con.query("insert into scripts (user_id,watermark,is_lossy,quality) VALUES ?",
		  [[[parseInt(userid),watermark,parseInt(lossy),parseInt(quality)]]],
		  (err, result) => {
			return err ? reject(err) : resolve(result.insertId);
		  }
		);
	  });
}

function get_uuid(){
	return Date.now() + ( (Math.random()*100000).toFixed());
}

async function processImg(image,userid,swid,webp) {

	const stringList = image.split('.');
	const pathList = stringList[stringList.length-2].split('/');
	var ext = stringList[stringList.length-1];
	const name = pathList[pathList.length-1];
	console.log(ext);
	if (ext === 'ico' || ext == 'bmp'){
		return null;
	}

	const sw_data = await get_sw_data(userid,swid);
	const lossy = sw_data.is_lossy;
	const watermark_exists = sw_data.watermark;
	const quality = sw_data.quality;


	//check parameters to set the final extension after compression
	if (webp == 1){
		ext = 'webp';
	}else if(lossy == 1){
		ext = 'jpeg';
	}else{
		ext ='png';
	}

	// check if img is in database
	const imgDBname = await check_if_exists(swid,image);

	console.log(imgDBname);
	var imgpath;
	var insertName;
	
	//if img in database check if it exists localy and send else create it and insert it to the db
	if (imgDBname){
		imgpath = `${__dirname}/users/${imgDBname}.${ext}`;
		try {
			if (fs.existsSync(imgpath)) {
				return imgpath;
			}
		} catch(err) {
			console.error(err);
		}
	}else{
		const uuid = get_uuid();
		imgpath = `${__dirname}/users/${userid}/${swid}/${name}${uuid}.${ext}`;
		insertName = `${userid}/${swid}/${name}${uuid}`;
		const dir = `${__dirname}/users/${userid}/${swid}/`;
		if(!fs.existsSync(dir)){
			fs.mkdirSync(dir, { recursive: true });
		}
	}


	// const imgpath = `${__dirname}/users/${userid}/${swid}/${name}$.${ext}`;
	// try {
	// 	if (fs.existsSync(imgpath)) {
	// 		return imgpath;
	// 	}
	// } catch(err) {
	// 	console.error(err);
	// }
	console.log(imgpath);

	//read image and it's metadata
	const input = await axios.get(image, {responseType: 'arraybuffer'});
	const metadata = await sharp(input.data).metadata()

	//if watermark exists apply watermark
	if (watermark_exists == 1){
		const composite = await sharp(`${__dirname}/users/${userid}/${swid}/data/watermark.png`).toBuffer();
		const watermark = await sharp(composite).resize(metadata.width,metadata.height,{fit: 'fill'}).toBuffer();
		if (lossy === 1){
			if(webp === 1){
				await sharp(input.data).composite([{input:watermark}]).webp({lossless:false,quality:quality}).toFile(imgpath);
			}else{
				await sharp(input.data).composite([{input:watermark}]).jpeg({quality:quality}).toFile(imgpath);
			}
		}else{
			if(webp === 1){
				await sharp(input.data).composite([{input:watermark}]).webp({lossless:true}).toFile(imgpath);
			}else{
				await sharp(input.data).composite([{input:watermark}]).png().toFile(imgpath);
			}
		}
	}else{
		if (lossy === 1){
			if(webp === 1){
				await sharp(input.data).webp({lossless:false,quality:quality}).toFile(imgpath);
			}else{
				await sharp(input.data).jpeg({quality:quality}).toFile(imgpath);
			}
		}else{
			if(webp === 1){
				await sharp(input.data).webp({lossless:true}).toFile(imgpath);
			}else{
				await sharp(input.data).png().toFile(imgpath);
			}
		}
	}
    if (!imgDBname){
        await add_image(userid,swid,image,insertName);
    }
  	return imgpath;
}

app.post('/addSW',async function(request, response) {
	new formidable.IncomingForm().parse(request,async (err, fields, files) => {
		if (err) {
		  console.error('Error', err)
		  response.sendStatus(400)
		}
        const userid = request.session.user_id;
        
        
        var watermark;

        if (files.watermark.size > 0){
			watermark = 1;
		}else{
            watermark = 0;
        };
		const id = await add_sw(userid,watermark,fields.lossy,fields.quality);

        const location = `${__dirname}/users/${userid}/${id}/data/`;
		const newpath = `${location}/watermark.png`;

		// if watermark picture doesn't exists update the values for inserting in db

        if(!(fs.existsSync(location) == 1)){
            try{
                fs.mkdirSync(location, { recursive: true });
            }catch(err){
                console.log(err);
            }
        }
		if(id){
			if(watermark == 1){
				fs.rename(files.watermark.path, newpath, function (err) {
				if (err){
					console.error('Error',err)
					response.sendStatus(400);
				}else{
					response.sendStatus(200);
				}
				});
			}else{
                response.sendStatus(200);
            }
		}else{
			response.sendStatus(200);
		}
	})
  })

app.post('/processImg',async function(request, response) {
  try{
    console.log('POST /')
    console.dir(request.body.img);
    if (request.body.img){
      const name = await processImg(request.body.img,request.body.userid,request.body.swid,request.body.webp);
      if (name){
        response.sendFile(name);
      }else{
        response.sendStatus(400);
      }
    }else{
      response.sendStatus(400);
    }
  }catch(err){
      console.log(err);
      response.end();
  }
})

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