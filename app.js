// Module Dependencies

var express = require('express');
var redis = require('redis');
var client = redis.createClient();
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

// Routes

function newCategory(req, res, next){
  var name = req.body.name;
  var guardian = req.body.guardian;
  client.get('category.name:' + name + ':cid', function(err, cid){
    if (cid !== null){
      res.redirect('back');
    }
    else{
      client.incr('nextcid', function(err, cid){
        client.incr('nextgid', function(err, gid){
          client.incr('nextaid', function(err, aid){
            client.set('cid:' + cid + ':category.name', name);
            client.set('category.name:' + name + ':cid', cid);
            
            if (guardian !== 'none'){
              client.get('category.name:' + guardian + ':cid', function(err, guardianCID){
                client.hset('cid:' + cid, 'guardian', guardianCID);
                client.hgetall('cid:' + cid, function(err, category){
                });
              });
            }
            
            client.hmset('cid:' + cid, {
              cid: cid,
              gid: gid,
              aid: aid,
              name: name
            });
            
            client.hgetall('cid:' + cid, function(err, newcategory){
              req.newcategory = newcategory;
              next();
            });
          });
        });
      });
    }
  });
}

app.param('categoryName', function(req, res, next, categoryName){
  client.get('category.name:' + categoryName + ':cid', function(err, cid){
    if (cid !== null){
      client.hgetall('cid:' + cid, function(err, category){
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
	var categories = [];
	client.get('nextcid', function(err, cid){
    for (var i = 1; i <= cid; i++){
	    client.get('cid:' + i + ':category.name', function(err, name){
		    categories.push({cid: i, name: name});
    	});
    }
	});
	setTimeout(function(){
		res.render('newcategory', {
	    categories: categories
	  });
	}, 1);
});

app.post('/new/category', newCategory, function(req, res){
  res.redirect('back');
});
app.listen(80);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);