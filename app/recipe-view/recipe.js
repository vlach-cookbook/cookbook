'use strict';

angular.module('cookbookApp.recipe', ['ngRoute', 'ngSanitize'])

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

.service('ingredientIndex', ['fbRoot', function(fbRoot) {
  var ingredientNames = fbRoot.child('ingredientNames');
  var ingredientRecipes = fbRoot.child('ingredientRecipes');
  var ingredientNamesCache = new Map();
  function setIngredient(snapshot) {
    var ingredientName = snapshot.key();
    var ingredientId = snapshot.val();
    ingredientNamesCache.set(ingredientName, ingredientId);
  };
  ingredientNames.on('child_added', setIngredient);
  ingredientNames.on('child_changed', setIngredient);
  ingredientNames.on('child_removed', function removeIngredient(snapshot) {
    var ingredientName = snapshot.key();
    ingredientNamesCache.delete(ingredientName);
  });
  return {
    add: function(ingredientName, recipeId, recipeTitle) {
      var ingredientId = ingredientNamesCache.get(ingredientName);
      if (ingredientId === undefined) {
        ingredientId = ingredientRecipes.push().key();
        ingredientNames.child(ingredientName).set(ingredientId);
      }
      ingredientRecipes.child(ingredientId).child(recipeId).set(recipeTitle);
    },
    remove: function(ingredientName, recipeId) {
      var ingredientId = ingredientNamesCache.get(ingredientName);
      var ingredient = ingredientRecipes.child(ingredientId);
      ingredient.child(recipeId).remove();
      // limitToFirst(1) avoids downloading lots of data for popular ingredients.
      ingredient.limitToFirst(1).once('value', function(snapshot) {
        if (!snapshot.exists()) {
          // There's a race condition if another client adds a recipe
          // for this ingredient before the remove() arrives at the
          // server.
          ingredientNames.child(ingredientName).remove();
        }
      });
    },
  };
}])

.controller('RecipeCtrl', ['$scope', '$routeParams', '$firebaseObject', '$firebaseArray', 'fbRoot', '$location', 'ingredientIndex',
  function($scope, $routeParams, $firebaseObject, $firebaseArray, fbRoot, $location, ingredientIndex) {
    var recipesMeta = fbRoot.child('recipesMeta');
    var recipesDetails = fbRoot.child('recipesDetails');
    var recipeUrls = fbRoot.child('recipeUrls');
    var ingredientNames = fbRoot.child('ingredientNames');
    var ingredientRecipes = fbRoot.child('ingredientRecipes');

    // Maps an ingredient name to the set of ingredient objects that
    // specify that ingredient:
    var ingredientCache = new BiMap();

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
      $scope.recipeId = recipeId;
      $scope.recipe_ingredients = $firebaseArray(recipesDetails.child(recipeId).child('ingredients'));
      $scope.recipe_ingredients.$watch(ingredientChangedFromServer);
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

    function ingredientChangedFromServer(obj) {
      // If an ingredient was changed on the server, we need to update
      // the name<->key bimap, but we don't need to update the index.
      var ingredient = $scope.recipe_ingredients.$getRecord(obj.key);
      switch (obj.event) {
      case 'child_added':
        // Add the ingredient's key to the cache's list for the ingredient name.
        ingredientCache.appendVal(ingredient.name, obj.key);
        break;
      case 'child_removed':
        // Remove the ingredient's key from the cache.
        ingredientCache.removeVal(obj.key);
        break;
      case 'child_changed':
        // Do nothing if the ingredient name stayed the same.
        if (ingredientCache.val(obj.key) !== ingredient.name) {
          // Remove the old mapping and add the new one.
          ingredientCache.removeVal(obj.key);
          ingredientCache.appendVal(ingredient.name, obj.key);
        }
        break;
      }
    }
    $scope.ingredientNameChanged = function(ingredient) {
      var ingredientId = $scope.recipe_ingredients.$keyAt(ingredient);
      // Find the old name of this ingredient.
      var ingredientName = ingredientCache.val(ingredientId);
      // If no other ingredients have that name...
      if (ingredientName !== undefined) {
        ingredientCache.removeVal(ingredientId);
        if (ingredientCache.key(ingredientName) === undefined) {
          // ... remove it from the index.
          ingredientIndex.remove(ingredientName, $scope.recipeId);
        }
      }
      // Now add the new name and key to the cache and index.
      if (ingredientCache.key(ingredient.name) === undefined) {
        ingredientIndex.add(ingredient.name, $scope.recipeId, $scope.recipeMeta.title);
      }
      ingredientCache.appendVal(ingredient.name, ingredientId);
      // And save the change to the ingredient.
      $scope.recipe_ingredients.$save(ingredient);
    };

    $scope.removeIngredient = function(ingredient) {
      var ingredientId = $scope.recipe_ingredients.$keyAt(ingredient);
      var ingredientName = ingredientCache.val(ingredientId);
      if (ingredientName !== undefined) {
        ingredientCache.removeVal(ingredientId);
        if (ingredientCache.key(ingredientName) === undefined) {
          ingredientIndex.remove(ingredientName, $scope.recipeId);
        }
      }
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

.filter('newlinesToBrs', function() {
  return function(input) {
    if (input === undefined) return input;
    return input.replace(/\n/g, '<br>');
  };
})
;
