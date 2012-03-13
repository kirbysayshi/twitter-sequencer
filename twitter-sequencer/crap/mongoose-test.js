
var  mongoose = require('mongoose')
	
	,models = {}
	,schemas = {}

	,tweets = [
		 { id_str: '02020202020', name: 'Drew', color: 'green' }
		,{ id_str: '02020202020', name: 'Cindy', color: 'red' }
		,{ id_str: '02020202020', name: 'Alex', color: 'blue' }
	]

schemas.TTweet = new mongoose.Schema({});

schemas.TSequence = new mongoose.Schema({
	 created_at: Date
	,tweets: []
	,hash: String
});

models.TTweet = mongoose.model('TTweet', schemas.TTweet);
models.TSequence = mongoose.model('TSequence', schemas.TSequence);
mongoose.connect('mongodb://localhost/twitter-mongoose-test');


var sequence = new models.TSequence();

sequence.created_at = new Date();
sequence.hash = 'whatwhat';

tweets.forEach(function(tweet){
	console.log('pushing tweet', tweet.id_str);
	sequence.tweets.push(tweet);	
});

console.log('before save', sequence);
sequence.save(function(err){
	if(!err){
		console.log('created new tweet sequence', sequence);
	} else {
		console.log('error creating new tweet sequence', err);
	}

	console.log(sequence);
});