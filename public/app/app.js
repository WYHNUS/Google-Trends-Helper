var app = angular.module("trends", [
	"ngRoute"
]);

app.config(["$routeProvider",
	function($routeProvider) {
		$routeProvider.
			when("/", {
				templateUrl: "/app/components/home/homePage.html",
				controller: "homeController"
			}).
			otherwise({
				redirectTo: "/"
			});
	}]);