const mysql = require('mysql');

const con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    port: '3308',
    password: '',
    database: "picolo_db"
});

con.connect(function(err){
    if(err){
        console.log(err);
    } else {
        console.log('connected');
    }
});


const createUsers = "create table users ( id int auto_increment primary key, username varchar(255) not null, password varchar(255) not null )";
const createScripts = "create table scripts ( id int auto_increment, user_id int not null, watermark int, is_lossy int, quality int, primary key (id), foreign key (user_id) references users(id) on delete cascade )"
const createImages = "create table images ( id int auto_increment, user_id int not null, script_id int not null, image_link varchar(255) not null, compressed_image varchar(255) not null, primary key (id), foreign key (user_id) references users(id) on delete cascade, foreign key (script_id) references scripts(id) on delete cascade )";

con.query(createUsers, function(err, results, fields){
    if(err){
        console.log(err);
    } else {
        console.log(results);
        console.log('-------------');
        console.log(fields);
    }
})

con.query(createScripts, function(err, results, fields){
    if(err){
        console.log(err);
    } else {
        console.log(results);
        console.log('-------------');
        console.log(fields);
    }
})

con.query(createImages, function(err, results, fields){
    if(err){
        console.log(err);
    } else {
        console.log(results);
        console.log('-------------');
        console.log(fields);
    }
})

con.end(function(err){
    if(err){
        console.log(err);
    } else {
        console.log("disconnected");
    }
})