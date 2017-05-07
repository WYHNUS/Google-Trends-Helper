var express = require('express');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');
var request = require('request');
// only useful for individual keyword search
var googleTrends = require('google-trends-api');
var fs = require("fs");
var csvWriter = require('csv-write-stream');

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


// currently used to generate csv file
var region = 'US';
// variables needed to crawl top 15 in the Google Trends
var category = 'b';
var url = 'https://trends.google.com.sg/trends/api/stories/latest?hl=en-US&tz=-480&cat=' 
		+ category + '&fi=15&fs=15&geo=' + region + '&ri=300&rs=15&sort=0';

// keyword list needed to craw for individual keyword information
var keywordList = [
					['North Korea', 'Netherlands', 'Singapore'],
					['North Korea', 'South Korea', 'America']
				  ];

// unit in days --> note: if set to 7 or above the interval will become daily instead of hourly
var durationPeriod = 6; 

// base time set to UTC +5 which in line with the default one in google-trends-api
// refer to https://webcache.googleusercontent.com/search?q=cache:6wtZXllMV8AJ:https://forbrains.co.uk/international_tools/earth_timezones+&cd=1&hl=en&ct=clnk&gl=us
// assuming user location is Singapore, hence UTC in minutes is 480
var userTimezone = 480;

var nowTime = (new Date).getTime() - (userTimezone - 300) * 60 * 1000;
var startDate = new Date(nowTime - durationPeriod * 24 * 60 * 60 * 1000);
var startDateString = startDate.toISOString().substring(0, 10);

var crawlTop15TrendsName = function() {
	request(url, function (error, response, body) {
		if (error) {
			console.log("Error: " + error);
		}
		// Check status code (200 is HTTP OK)
		if (response.statusCode === 200) {
			console.log('Top 15 in the list are : ');

			var stories = JSON.parse(body.substring(4));
			var storyList = stories.storySummaries.trendingStories;
			var titleList = []

			for (var i in storyList) {
				// titleList.push(storyList[i].title);
				console.log(storyList[i].title);
			}
		}
	});
}

var crawlKeywordListTrends = function(titleListLst) {
	var promises = [];

	for (var i in titleListLst) {
		var titleList = titleListLst[i];
		// call back function
		var cbFuntion = function(region, titleList, resolve, results) {
			var resList = JSON.parse(results);
			var timelineData = resList.default.timelineData;

			var headers = ['Region', 'News Title'];
			for (var i in timelineData) {
				headers.push(timelineData[i].formattedAxisTime);
			}

			var lineData = [];
			for (var i in titleList) {
				lineData.push([region, titleList[i]]);
				for (var j in timelineData) {
					lineData[i].push(timelineData[j].value[i]);
				}
			}

			console.log('resolve task list' + titleList);
			resolve({
				header: headers,
				lineData: lineData
			});
		};

		promises.push(
			new Promise((resolve, reject) => {
				var cbBind = cbFuntion.bind(null, region, titleList);

				googleTrends.interestOverTime({
					keyword: titleList,
					startTime: new Date(startDateString), 
					geo: region
				}).then((res) => {
					cbBind(resolve, res);
				}).catch((err) => {
					reject(err);
				});
			})
		);	
	}

	Promise.all(promises).then(function(result) {
		console.log('result returned ' + result.length);

		var writer = csvWriter({ headers: result[0].header });
		writer.pipe(fs.createWriteStream(result[0].lineData[0][0] + '.csv'));

		// write to file
		result.forEach((res) => {
			for (var i in res.lineData) {
				writer.write(res.lineData[i]);
			}
			writer.write('\n');
		});
		writer.end();

		console.log('task completed');
	}, function(err) {
		console.log(err);
	});
}

// temporary usage -> function call
// crawlTop15TrendsName();
crawlKeywordListTrends(keywordList);

// code related to website is commented out temporarily for ease of generating csv function alone

// // entry page
// app.get('/', function(req, res) {
// 	res.render('home');
// });

// app.post("/getTrend", function(req, res) {
// 	/*
// 		Crawl from URL: https://trends.google.com/trends/home/<category>/<region>
// 		and list the top 20 popular stories' names
// 	*/
// 	var category = 'b';
// 	var region = 'US';
// 	var url = 'https://trends.google.com.sg/trends/api/stories/latest?hl=en-US&tz=-480&cat=' 
// 			+ category + '&fi=15&fs=15&geo=' + region + '&ri=300&rs=15&sort=0';

// 	request(url, function (error, response, body) {
// 		if (error) {
// 			console.log("Error: " + error);
// 		}
// 		// Check status code (200 is HTTP OK)
// 		if (response.statusCode === 200) {
// 			var stories = JSON.parse(body.substring(4));
// 			res.send({
// 				data: JSON.stringify(stories.storySummaries.trendingStories)
// 			});
// 		}
// 	});
// });

function resError(res, err) {
    return res.status(500).json({
        message: err.message
    });
}

http.createServer(app)
	.listen(port, function(server) {
		console.log('Listening on port %d', port);
	});