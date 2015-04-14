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

.controller('RecipeCtrl', ['$scope', '$routeParams', '$firebaseObject', '$firebaseArray', 'FBURL', '$location',
  function($scope, $routeParams, $firebaseObject, $firebaseArray, FBURL, $location) {
    var recipes = new Firebase(FBURL).child('recipes');
    var titles = new Firebase(FBURL).child('titles');
    Promise.resolve().then(function() {
      if ($location.path() === '/new') {
        $scope.editing = true;
        return recipes.push({title: '', ingredients: {}, directions: ''});
      } else {
        $scope.spinner = true;
        $scope.editing = $location.search()['edit'] !== undefined;
        return new Promise(function(resolve, reject) {
          titles.child($routeParams.recipeTitle)
            .once('value', function(snapshot) {
              resolve(recipes.child(snapshot.val()));
            });
        });
      }
    }).then(function(recipePath) {
      $scope.recipe_ingredients = recipePath.child('ingredients');
      return $firebaseObject(recipePath).$bindTo($scope, 'recipe');
    }).then(function() {
      $scope.spinner = false;
    });

    function sanitizeTitle(title) {
      return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    $scope.setTitle = function() {
      titles.child(sanitizeTitle($scope.recipe.title)).set($scope.recipe.$id);
    };
    $scope.addIngredient = function() {
      $scope.recipe_ingredients.push({
        count: '', unit: '', name: '', preparation: ''});
    };
    $scope.removeIngredient = function(key) {
      $scope.recipe_ingredients.child(key).remove();
    };
    $scope.save = function() {
      $location.path('/recipe/' + sanitizeTitle($scope.recipe.title)).search('');
    };
    $scope.edit = function() {
      $location.search({'edit': 1});
    };
}])
;
