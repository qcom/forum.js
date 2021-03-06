// Module Dependencies

var express = require('express');
var redis = require('redis');
var client = redis.createClient();
var cradle = require('cradle');
var RedisStore = require('connect-redis')(express);
var crypto = require('crypto');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view options', {layout: false});
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: '*ORWTcbowc479tyapbtowWPC$Wy', store: new RedisStore }));
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Cradle

var c = new(cradle.Connection)();
var db = c.database('forum');
db.create();

// Dynamic Helpers

app.dynamicHelpers({
	categories: function(req, res){
		var categories = [];
		client.get('nextcid', function(err, cid){
			for (var i = 1; i <= cid; i++){
				db.get(i.toString(), function(err, category){
					categories.push(category);
				});
			}
		});
		return categories;
	}
});

// Routes

function newCategory(req, res, next){
	var data = req.body;
	client.get('category.name:' + data.name + ':cid', function(err, cid){
		if (cid !== null){
			res.render('newcategory', {
				flash: 'category already in use!'
			});
		}
		else{
			client.incr('nextcid', function(err, cid){
				data.cid = cid;
				client.set('category.name:' + data.name + ':cid', cid);
				client.set('cid:' + cid + ':category.name', + data.name);
				db.save(cid.toString(), data, function(db_err, db_res){
					res.render('newcategory', {
						flash: 'category created!'
					});
				});
			});
		}
	});
}

app.param('categoryName', function(req, res, next, categoryName){
	client.get('category.name:' + categoryName + ':cid', function(err, cid){
		if (cid !== null){
			db.get(cid, function(err, category){
				req.category = category;
				next();
			});
		}
		else{
			next(new Error('not a category'));
		}
	});
});

app.get('/', function(req, res){
  res.render('index');
});

app.get('/category/:categoryName', function(req, res){
  res.render('category', {
    title: req.category.name,
    category: req.category
  });
});

app.get('/new/category', function(req, res){
	res.render('newcategory');
});

app.post('/new/category', newCategory, function(req, res){
  res.redirect('back');
});
app.listen(80);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);