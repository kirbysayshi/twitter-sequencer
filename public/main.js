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

			//var where = { 'sequenceId': parseId };
			var where = { 'tsequence': { '__type': 'Pointer', 'className': 'tsequence', 'objectId': parseId } };

			return $.parse.get('ttweet?order=sortOrder&include=tsequence', where).done(function(sequence){
				if(window.localStorage){
					window.localStorage[parseId] = JSON.stringify(sequence);
				}
			});
		}

		,saveSequence: function(tweets){

			var dfd = new $.Deferred();
			
			$.parse
				.post('tsequence',{ tweetCount: tweets.length })
				.then(function(json){

					var dfds = [];

					if(json.objectId){
						tweets.forEach(function(t, i){
							var body = {
								 content: t
								,tsequence: { __type: 'Pointer', className: 'tsequence', objectId: json.objectId } 
								,sortOrder: i
							}

							dfds.push( $.parse.post('ttweet', body) );
						});
					}

					$.when.apply($, dfds).then(function(){

						[].slice.apply(arguments).forEach(function(req){

							// 0 = responseObj
							// 1 = statusText
							// 2 = jqXHR

							if(req[2].status !== 201){
								dfd.reject( req );
							}
						})

						if(dfd.state() !== 'rejected'){
							// tweets were successful, resolve with original sequence result
							dfd.resolve( json )
						}

					}, dfd.reject);

				}, twsq.error);

			return dfd;
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

var TweetModel = Backbone.Model.extend({
	defaults: {
		sequenceId: []
	}
});

var TweetsCollection = Backbone.Collection.extend({ model: TweetModel });

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

		twsq.app.navigate( 'c/' + ids.join(','), { trigger: true, replace: true } );
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

		this.bind('all', this.trackPageView, this);
	}

	,trackPageView: function(){
		return _gaq.push(['_trackPageView'], '/' + Backbone.history.getFragment());
	}

	,root: function(){
		twsq.app.navigate( 'b/' + 't6sMeIum7R', { trigger: true } )
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
			if(sequence.results && sequence.results.length){

				$('.main-content').html( tpl( sequence.results ) );

				document.title = sequence.results[0].content.text.substring(0, 40) + '... - Twitter Sequencer';
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
