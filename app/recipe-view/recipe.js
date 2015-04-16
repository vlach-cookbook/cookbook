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
    var recipesMeta = new Firebase(FBURL).child('recipesMeta');
    var recipesDetails = new Firebase(FBURL).child('recipesDetails');
    var recipeUrls = new Firebase(FBURL).child('recipeUrls');
    Promise.resolve().then(function() {
      if ($location.path() === '/new') {
        $scope.editing = true;
        var recipeId = recipesMeta.push({title: ''}).key();
        recipesDetails.child(recipeId).update({directions: ''});
        return recipeId;
      } else {
        $scope.spinner = true;
        $scope.editing = $location.search()['edit'] !== undefined;
        return new Promise(function(resolve, reject) {
          recipeUrls.child($routeParams.recipeTitle)
            .once('value', function(snapshot) {
              if (snapshot.exists()) {
                resolve(snapshot.val().id);
              } else {
                reject("404: " + $routeParams.recipeTitle + " not found");
              }
            }, function(err) {
              reject(err);
            });
        });
      }
    }).then(function(recipeId) {
      $scope.recipe_ingredients = $firebaseArray(recipesDetails.child(recipeId).child('ingredients'));
      $scope.recipeMeta = $firebaseObject(recipesMeta.child(recipeId));
      $scope.recipeDetails =$firebaseObject(recipesDetails.child(recipeId));
      return Promise.all([
        $scope.recipeMeta.$loaded(),
        $scope.recipeDetails.$loaded(),
        $scope.recipe_ingredients.$loaded(),
      ]);
    }).then(function() {
      $scope.spinner = false;
    });

    function sanitizeTitle(title) {
      return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    $scope.setTitle = function() {
      $scope.recipeMeta.$ref().child('title').set($scope.recipeMeta.title);
      recipeUrls.child(sanitizeTitle($scope.recipeMeta.title))
        .set({id: $scope.recipeMeta.$id});
    };
    $scope.addIngredient = function() {
      $scope.recipe_ingredients.$add({
        quantity: '', unit: '', name: '', preparation: ''});
    };
    $scope.removeIngredient = function(ingredient) {
      $scope.recipe_ingredients.$remove(ingredient);
    };
    $scope.setDirections = function() {
      $scope.recipeDetails.$ref().child('directions').set($scope.recipeDetails.directions);
    };
    $scope.save = function() {
      $location.path('/recipe/' + sanitizeTitle($scope.recipeMeta.title)).search('');
    };
    $scope.edit = function() {
      $location.search({'edit': 1});
    };
}])
;
