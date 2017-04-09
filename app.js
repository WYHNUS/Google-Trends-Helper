var express = require('express');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');
var request = require('request');
// only useful for individual keyword search
// var googleTrends = require('google-trends-api');

var port = 8088;
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/scripts', express.static(__dirname + '/node_modules/angular'));
app.use('/scripts', express.static(__dirname + '/node_modules/angular-route'));

// entry page
app.get('/', function(req, res) {
	res.render('home');
});

app.post("/getTrend", function(req, res) {
	/*
		Crawl from URL: https://trends.google.com/trends/home/<category>/<region>
		and list the top 20 popular stories' names
	*/
	var category = 'b';
	var region = 'US';
	var url = 'https://trends.google.com.sg/trends/api/stories/latest?hl=en-US&tz=-480&cat=' 
			+ category + '&fi=15&fs=15&geo=' + region + '&ri=300&rs=15&sort=0';

	request(url, function (error, response, body) {
		if (error) {
			console.log("Error: " + error);
		}
		// Check status code (200 is HTTP OK)
		if (response.statusCode === 200) {
			var stories = JSON.parse(body.substring(4));
			res.send({
				data: JSON.stringify(stories.storySummaries.trendingStories)
			});
		}
	});
});

function resError(res, err) {
    return res.status(500).json({
        message: err.message
    });
}

http.createServer(app)
	.listen(port, function(server) {
		console.log('Listening on port %d', port);
	});