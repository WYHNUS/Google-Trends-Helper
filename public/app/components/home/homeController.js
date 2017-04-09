angular.module("trends").controller("homeController",
	["$scope", "$http",
	function($scope, $http) {
		$scope.title = "Google Trends Crawler";
		$scope.newsList = [];

		$http.post("/getTrend").then(function(res) {
			console.log(res);
			$scope.newsList = JSON.parse(res.data.data);
        });
	}]);