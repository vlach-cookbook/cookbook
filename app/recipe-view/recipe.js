'use strict';

angular.module('cookbookApp.recipe', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/recipe/:recipeTitle', {
    templateUrl: 'recipe-view/recipe.html',
    controller: 'RecipeCtrl'
  });
  $routeProvider.when('/new', {
    templateUrl: 'recipe-view/recipe.html',
    controller: 'RecipeCtrl'
  });
}])
'use strict';

angular.module('cookbookApp.recipe', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/recipe/:recipeTitle', {
    templateUrl: 'recipe-view/recipe.html',
    controller: 'RecipeCtrl'
  });
  $routeProvider.when('/new', {
    templateUrl: 'recipe-view/recipe.html',
    controller: 'RecipeCtrl'
  });
}])

.controller('RecipeCtrl', ['$scope', '$routeParams', '$firebaseObject', 'FBURL', '$location',
  function($scope, $routeParams, $firebaseObject, FBURL, $location) {
    var recipes = new Firebase(FBURL).child('recipes');
    var titles = new Firebase(FBURL).child('titles');
    if ($location.path() === '/new') {
      $firebaseObject(recipes.push()).$bindTo($scope, 'recipe');
      $scope.edit = true;
    } else {
      $scope.spinner = true;
      $scope.edit = $location.search()['edit'] !== undefined;
      new Firebase(FBURL).child('titles').child($routeParams.recipeTitle).once('value', function(snapshot) {
        var recipeId = snapshot.val();
        $scope.spinner = false;
        $firebaseObject(recipes.child(recipeId)).$bindTo($scope, 'recipe');
      });
    }
    function sanitizeTitle(title) {
      return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    $scope.setTitle = function() {
      console.log('Setting title "' + $scope.recipe.title + '" to ' + $scope.recipe.$id);
      titles.child(sanitizeTitle($scope.recipe.title)).set($scope.recipe.$id);
    };
}])
;
