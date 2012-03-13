(function($, exports, undefined){

exports.twsq = {

	parseHash: function(hash){

		// try for #####,####,#####

		// try for ######-#######,####

		var  done = $.Deferred()
			,sections = hash.slice(1).split(',')
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

	,grabTweet: function(id){

		return $.getJSON('https://api.twitter.com/1/statuses/oembed.json?callback=?&omit_script=true&id=' + id);
	}

	,renderTweets: function(htmls){
		var front = '<div class="tweet-wrap">'
			,end = '</div>';

		$('div[role=main]').append( front + htmls.join(end + front) + end );
		$('<script/>', {
			src: 'http://platform.twitter.com/widgets.js'
		}).appendTo('body');
	}

	,startDisplay: function(){

		var ids = twsq.parseHash(window.location.hash);

		ids.done(function(idArr){

			var idDfds = [];

			if(idArr.length < 2) {
				return;
			};

			idArr.forEach(function(id){
				idDfds.push( twsq.grabTweet(id) );
			})

			$.when.apply($, idDfds).done(function(){
				var htmls = [].slice.call(arguments).map(function(tweetResp){

					if(tweetResp[1] === 'success'){
						return tweetResp[0].html;
					}

				});

				twsq.renderTweets(htmls);
			})

		});

	}
};

$(function(){
	if(window.location.hash !== ''){
		twsq.startDisplay();
	}
})


})(jQuery, window);