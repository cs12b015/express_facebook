var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var mysql   = require('mysql')
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session')
var routes = require('./routes/index');
var users = require('./routes/users');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var graph = require('fbgraph');
var TABLE="test_table";

var app = express();
var connectionpool = mysql.createPool({
        host     : 'localhost',
        user     : 'root',
        password : 'jayanthk19',
        database : 'jaydb'
    });


passport.use(new FacebookStrategy({
 clientID: "1591772771103115",
 clientSecret: "6c5304df365dc4d048a34fb9aebfbb24",
 callbackURL: "http://localhost:3000/auth/facebook/callback"
},
function(accessToken, refreshToken, profile, done) {
  graph.setAccessToken(accessToken);
 process.nextTick(function () {
   return done(null, profile);
 });
}
));
app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 60000 }}));
app.use(passport.initialize());
app.use(passport.session());


var filename = "output";
var messagearray=[];
var userid;
var username;

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));





var extractfunc=function(minurl){
	graph.get(minurl, function(err, res) {
	if(err){console.log(err)}
	else{
		//console.log(res.data);
		makenicearray(res.data);
		if(res.paging && res.paging.next) {
			extractfunc(res.paging.next);
		}
		else{
			console.log(messagearray.length);
		}
		}
	});

}
var insertfunc= function(msgData){

	/*We can use orm here*/
	connectionpool.getConnection(function(err, connection) {
   		if (err) 
   		{
            console.log(err);
    	} 
    	else
    	{
        	var que=connection.query('insert into '+ TABLE + ' SET ?',msgData, function(err,results) 
        	{
            	if (err) {
                	console.log(err);
		        }	
		        else{			             
			        console.log("Information sucessfully inserted into table");
			    }
		        connection.release();
		    });
    	}
	});
}



var makenicearray=function(arr){
	var n=arr.length;
	for(var i=0;i<n;i++){
		if(arr[i].message)
		{
			message1=arr[i].message;
			message_id1=arr[i].id;
			msgData = {
				user_id:userid,
	  			message_id: message_id1,
	  			message: message1
		  	};
		  	messagearray[messagearray.length]=msgData;
		  	//console.log(userid+"  |  "+message_id1);

		  	insertfunc(msgData);
		}
	}
}


passport.serializeUser(function(user, done) {
done(null, user);
});
passport.deserializeUser(function(obj, done) {
done(null, obj);
});


app.get('/home',function(req,res,next){  

	graph.get('me?fields=statuses{message}', function(err, res) {
		if(err){console.log(err)}
		else{
			//console.log(res.statuses.data); 
			makenicearray(res.statuses.data);
			 if(res.statuses.paging && res.statuses.paging.next) {
				graph.get(res.statuses.paging.next, function(err, res) {
					if(err){console.log(err)}
					else
					{//console.log(res.data);
						makenicearray(res.data);
						if(err){console.log(err)}
						else{
					    	extractfunc(res.paging.next);
					    }
				    }
			    });
			}
		}
	});
	res.send("YEAH ITS WOrking");
});

app.get('/auth/facebook',passport.authenticate('facebook'),function(req, res){});

app.get('/auth/facebook/callback',
passport.authenticate('facebook', { failureRedirect: '/' }),
function(req, res) {
	graph.get('me?fields=id,name', function(err, res) 
    {
		//console.log(res)
		userid=res.id;
		username=res.name;
	});
 	res.redirect('/home');
});

app.get('/logout', function(req, res){
req.logout();
res.redirect('/');
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



app.use('/', routes);
app.use('/users', users);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});



// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}


// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;