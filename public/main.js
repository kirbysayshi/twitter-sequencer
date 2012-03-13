(function($, exports, undefined){

var twsq = exports.twsq = {

	parse: {
		 app_id: 'bZHaUoeyWlnVCPAJv8OruDlWlpgSIE8oeIidKWgE'
		,rest_key: 'xNXoVEJHFglGqVctUAZB7sha3osETNt7asivmkvi'

		,getSequence: function(parseId){
			var cached;
			if( window.localStorage && (cached = window.localStorage[parseId]) ){
				return new $.Deferred(function(dfd){
					dfd.resolve( JSON.parse(cached) );
				});
			}

			return $.parse.get('tsequences/' + parseId 	).done(function(sequence){
				if(window.localStorage){
					window.localStorage[parseId] = JSON.stringify(sequence);
				}
			});
		}

		,saveSequence: function(tweets){
			var m = new TweetSequenceModel({ tweets: tweets })
			return $.parse.post('tsequences', { body: m.toJSON() });
		}
	}

	,tweets: {

		 apiBase: 'https://api.twitter.com/1'

		,grabOne: function(id){
			return $.getJSON(twsq.tweets.apiBase + '/statuses/show/' + id + '.json?callback=?');
		}

		,grabMany: function(arr){

			var dfds = [];

			arr.forEach(function(t){

				if(t.indexOf('-') > -1){

				} else {
					dfds.push(twsq.tweets.grabOne(t));
				}
			});

			return $.when.apply($, dfds);
		}

		,cleanTweet: function(tweet){
			var  t = tweet.trim()
				,last = t[ t.length - 1 ]

			if(['.','!', '?', '"'].indexOf(last) === -1){
				t += '.'
			}

			return t;
		}
	}

	,parseIds: function(ids){

		// simple, for now
		return ids.split(',');
	}

	,error: function(){
		console.log('error', arguments);
	}
}

var TweetSequenceModel = Backbone.Model.extend({
	defaults: {
		tweets: []
	}
});

var CreateView = Backbone.View.extend({

	events: {
		 'click a.add-tweet': 'addItem'
		,'click a.remove-tweet': 'removeItem'
		,'click a.create-sequence': 'makeNew'
	}

	,initialize: function(){
		for(var i = 0; i < 5; i++){
			this.addItem();
		}
	}

	,addItem: function(e){

		if(e){ 
			e.stopPropagation(); 
			e.preventDefault(); 
		}

		this.$el.find('.items')
			.append( vash.compile( $('#new-item').html() )() );
	}

	,removeItem: function(e){

		if(e){ 
			e.stopPropagation(); 
			e.preventDefault(); 
		}

		$(e.currentTarget).closest('.new-item').remove();
	}

	,makeNew: function(e){

		if(e){ 
			e.stopPropagation(); 
			e.preventDefault(); 
		}

		var ids = _.reduce(this.$el.find('.new-item input'), function(memo, next){
			var parts = $(next).val().split('/');

			if(parts.length >= 1 && parts[0] !== ''){
				memo.push( parts.pop() );
			}

			return memo;
		}, []);

		if(ids.length <= 1) return;

		twsq.app.navigate( 'c/' + ids.join(','), { trigger: true } );
	}

});

var Router = Backbone.Router.extend({

	routes: {
		 '': 'root'
		,'i/:parseId': 'inline'
		,'b/:parseId': 'block'
		,'c/:ids': 'create'
		,'404': 'notFound'
	}

	,initialize: function(){
		$.parse.init({
			 app_id : twsq.parse.app_id
			,rest_key : twsq.parse.rest_key
		});
	}

	,root: function(){
		twsq.app.navigate( 'b/' + '9RJEOwLTCG' )
	}

	,inline: function(parseId){
		var tpl = vash.compile($('#tweet-inline').html());
		this.render(parseId, tpl);
	}

	,block: function(parseId){
		var tpl = vash.compile($('#tweet-block').html());
		this.render(parseId, tpl);
	}

	,render: function(parseId, tpl){
		twsq.parse.getSequence(parseId).then(function(sequence){
			if(sequence.objectId !== null){

				$('.main-content').html( tpl( sequence ) );
			}
		})
	}

	,create: function(ids){

		// show loading template
		$('.main-content').html( vash.compile( $('#creating-new').html() ) );
		window.scrollTo(0,1);

		// parse ids
		var ids = twsq.parseIds(ids);

		// query twitter for all tweets
		var tweetDfd = twsq.tweets.grabMany(ids);

		// when done, construct parse request
		tweetDfd.then(function(){

			var tweets = [].slice.apply(arguments).map(function(resp){
				var t = resp[0];
				t.text = twsq.tweets.cleanTweet( t.text );

				return t;
			});

			twsq.parse.saveSequence( tweets ).then(function(json){

				// when done, by default, redirect to inline view
				twsq.app.navigate( 'b/' + json.objectId, { trigger: true } )

			}, twsq.error);

		}, twsq.error);
	}

	,notFound: function(){

	}

});

twsq.app = new Router;

$(function(){
	// wait for DOMReady to allow templates to be ready
	Backbone.history.start();

	new CreateView({ el: '.create-sequence' });
})

})(jQuery, window);