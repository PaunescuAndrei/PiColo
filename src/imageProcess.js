const url = require('url');
const http = require('http');
const https = require('https');
const compression = require('compression');
var bodyParser = require('body-parser');
const cors = require('cors');
const sharp = require('sharp');
const axios = require('axios');
var express = require('express');
const fs = require('fs');
var app = express();
app.use(compression());
app.use(cors());
app.options('*', cors());

async function processImg(image) {

	const stringList = image.split('.');
	const pathList = stringList[stringList.length-2].split('/');
	var ext = stringList[stringList.length-1];
	const name = pathList[pathList.length-1];
	console.log(ext);
	if (ext === 'ico' || ext == 'bmp'){
		return null;
	}

	var webp = 1;
	var lossy = 1;
	var watermark_path = 'https://cdn.discordapp.com/attachments/446437526408921118/670446649998573568/watermark.png';
	var quality = 90;

	//check parameters to set the final extension after compression
	if (webp == 1){
		ext = 'webp';
	}else if(lossy == 1){
		ext = 'jpeg';
	}else{
		ext ='png';
	}


	const imgpath = __dirname +'/img/'+name+webp+lossy+quality+(watermark_path === "").toString()+'.'+ext;
	console.log(imgpath);

	//check if file exists in img folder
	try {
		if (fs.existsSync(imgpath)) {
			return imgpath;
		}
	} catch(err) {
		console.error(err);
	}

	//read image and it's metadata
	const input = await axios.get(image, {responseType: 'arraybuffer'});
	const metadata = await sharp(input.data).metadata()

	//if watermark exists apply watermark
	if (watermark_path != ""){
		const composite = await axios.get(watermark_path, {responseType: 'arraybuffer'});
		watermark = await sharp(composite.data).resize(metadata.width,metadata.height,{fit: 'fill'}).toBuffer();
		if (lossy == 1){
			if(webp == 1){
				await sharp(input.data).composite([{input:watermark}]).webp({lossless:false,quality:quality}).toFile(imgpath);
			}else{
				await sharp(input.data).composite([{input:watermark}]).jpeg({quality:quality}).toFile(imgpath);
			}
		}else{
			if(webp == 1){
				await sharp(input.data).composite([{input:watermark}]).webp({lossless:true}).toFile(imgpath);
			}else{
				await sharp(input.data).composite([{input:watermark}]).png().toFile(imgpath);
			}
		}
	}else{
		if (lossy == 1){
			if(webp == 1){
				await sharp(input.data).webp({lossless:false,quality:quality}).toFile(imgpath);
			}else{
				await sharp(input.data).jpeg({quality:quality}).toFile(imgpath);
			}
		}else{
			if(webp == 1){
				await sharp(input.data).webp({lossless:true}).toFile(imgpath);
			}else{
				await sharp(input.data).png().toFile(imgpath);
			}
		}
	}
  return imgpath;
}

app.use(bodyParser.urlencoded({ extended: true }));

app.post('/processImg',async function(request, response) {
  try{
    console.log('POST /')
    console.dir(request.body.img);
    if (request.body.img){
      const name = await processImg(request.body.img);
      if (name){
        response.sendFile(name);
      }else{
        response.sendStatus(404);
      }
    }else{
      response.sendStatus(404);
    }
  }catch(err){
      console.log(err);
      response.end();
  }
})


var options = {
    key: fs.readFileSync(__dirname +'/key.pem'),
    cert: fs.readFileSync(__dirname +'/cert.pem')
};

var httpServer = http.createServer(app);
var httpsServer = https.createServer(options, app);

httpServer.listen(3000);
httpsServer.listen(4000);
// app.listen(port);