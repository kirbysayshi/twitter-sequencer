var  express = require('express')
	,request = require('request')
	,mongoose = require('mongoose')
	,crypto = require('crypto')
	,D = require('Deferred');

var  models = {}
	,schemas = {}
	,services = { sequence: {} }
	,twitter = { get: {} }

	,sha1 = function(toHash){
		var h = crypto.createHash('sha1');
		h.update(toHash);
		return h.digest('hex');
	}

	,parseSequence = function(sequence){
		var  done = new D()
			,sections = sequence.split(',')
			,all = [];

		sections.forEach(function(s){
			
			// greater than 0 because we want to guarantee at least #-#
			//if(s.indexOf('-') > 0){
			//	
			//}

			all.push(s);
		});

		done.resolve(all);

		return done;
	}

	,app = express.createServer();

app.use(express.methodOverride());
app.use(express.bodyParser());
app.use(app.router);

app.set('view engine', 'jade');
app.set('view options', { layout: false });

app.configure('development', function(){
	app.use(express.static(__dirname + '/public'));
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
	var oneYear = 31557600000;
	app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
	app.use(express.errorHandler());
});



schemas.TTweet = new mongoose.Schema({});

schemas.TSequence = new mongoose.Schema({
	created_at: Date
	,tweets: []
	,hash: String
	,tweetsStr: String
});

models.TTweet = mongoose.model('TTweet', schemas.TTweet);
models.TSequence = mongoose.model('TSequence', schemas.TSequence);
mongoose.connect('mongodb://localhost/twitter-sequence');

twitter.get.tweet = function(id_str){

	var dfd = new D()
		,options = { 
			 url: 'http://twitter.com/statuses/show/' + id_str + '.json'
			,json: true 
		}

	request.get(options, function(e, r, body){

		if(!e && r.statusCode === 200){
			console.log('query complete for tweet', id_str);
			dfd.resolve( body );
		} else {
			dfd.reject(e, r.statusCode, body);
		}
	});

	return dfd;
}

twitter.get.tweets = function(tweetsStr, ids, hash){

	hash = hash || sha1(ids.join(','));

	return new D(function(dfd){
		var  idDfds = [];

		var onTweetsComplete = function(){
			
			console.log('tweets complete');

			var sequence = new models.TSequence();

			sequence.tweetsStr = tweetsStr;
			sequence.created_at = new Date();
			sequence.hash = hash;

			Array.prototype.slice.call(arguments).forEach(function(tweet){
				console.log('pushing tweet', tweet.id_str);

				tweet.text = services.sequence.cleanTweet(tweet.text);
				sequence.tweets.push(tweet);	
			});

			console.log(sequence);
			sequence.save(function(err){
				if(!err){
					console.log('created new tweet sequence', hash, sequence);
					dfd.resolve(sequence);
				} else {
					console.log('error creating new tweet sequence', err);
					dfd.reject(err);
				}
			});
		}

		var onTweetError = function(){
			console.log('tweets error', arguments);

			dfd.reject(arguments);
		}

		idDfds = ids.map(function(id){ 
			console.log('starting query for tweet id', id);
			return twitter.get.tweet(id);
		});

		D.when.apply(D, idDfds).then(onTweetsComplete, onTweetError);
	});
}

services.sequence.parse = function(sequence){
	var  done = new D()
		,sections = sequence.split(',')
		,all = [];

	sections.forEach(function(s){
		
		// greater than 0 because we want to guarantee at least #-#
		//if(s.indexOf('-') > 0){
		//	
		//}

		all.push(s);
	});

	done.resolve(all);

	return done;
}

services.sequence.cleanTweet = function(tweet){
	var  t = tweet.trim()
		,last = t[ t.length - 1 ]

	if(['.','!', '?', '"'].indexOf(last) === -1){
		t += '.'
	}

	return t;
}

services.sequence.get = function(tweetsStr){

	var  seqDfd = new D()
		,hash = sha1(tweetsStr)

		// look in mongo for sequence
		,found;

	console.log('sha1 tweets hash', tweetsStr);

	found = models.TSequence.findOne({ hash: hash }, function(err, doc){

		if(!err && doc){
			console.log('found sequence');

			// if found, render
			seqDfd.resolve(doc);

		} else {
			console.log('sequence does not exist')

			// if not found, decode...
			parseSequence(tweetsStr).done(function(tweets){

				console.log('parsed sequence', tweets);
				twitter.get.tweets( tweetsStr, tweets, hash ).then(seqDfd.resolve, seqDfd.reject);
			})
		}
	});

	return seqDfd;
}

app.get('/b/:tweets', function(req, res, next){

	var seqDfd = services.sequence.get(req.params.tweets);

	seqDfd.fail(function(){
		console.log('failed to get sequence', arguments);
		res.send(arguments);
	})

	seqDfd.done(function(doc){
		res.render('sequence-block.jade', {
			sequence: doc
		});
	});
});

app.get('/i/:tweets', function(req, res, next){

	var seqDfd = services.sequence.get(req.params.tweets);

	seqDfd.fail(function(){
		console.log('failed to get sequence', arguments);
		res.send(arguments);
	})

	seqDfd.done(function(doc){
		res.render('sequence-inline.jade', {
			sequence: doc
		});
	});

})

app.listen(8080);
console.log('app listening at port 8080');