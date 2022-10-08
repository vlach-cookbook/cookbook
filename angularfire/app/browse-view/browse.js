angular.module('cookbookApp.browse', [])

.service('groupAlphabetically', function groupAlphabeticallyFactory() {
  var collator = new Intl.Collator();
  var collate = collator.compare.bind(collator);
  function collateBy(projection) {
    return function(a, b) {
      return collate(projection(a), projection(b));
    };
  };

  return function groupAlphabetically(options) {
    // The array of data elements to group.
    var array = options.array;
    // A function that returns the label of an element, which will
    // be grouped by its upper-case first letter.
    var getLabel = options.label;
    // A function that returns the model object to use for an element.
    var getValue = options.value;

    var byLabel = {};
    array.forEach(function(elem) {
      var label = getLabel(elem);
      var value = getValue(elem);
      if (label.length === 0) return;
      var firstLetter = label[0].toUpperCase();
      if (byLabel[firstLetter] === undefined) {
        byLabel[firstLetter] = [];
      }
      byLabel[firstLetter].push({
        label: label,
        value: value,
      });
    });
    var byLabelArray = [];
    angular.forEach(byLabel, function(items, firstLetter) {
      items.sort(collateBy(function(item) { return item.label; }));
      byLabelArray.push({firstLetter: firstLetter, items: items});
    });
    byLabelArray.sort(collateBy(function(letter) { return letter.firstLetter; }));
    return byLabelArray;
  };
})

.service('groupAlphabeticallyAndBind', ['groupAlphabetically',
  function groupAlphabeticallyAndBindFactory(groupAlphabetically) {
    return function groupAlphabeticallyAndBind(options) {
      var scope = options.scope;
      var field = options.field;
      var fbArray = options.array;

      function bind() {
        scope[field] = groupAlphabetically(options);
      }
      fbArray.$loaded().then(function() {
        fbArray.$watch(bind);
        bind();
      });
    };
}])

.filter('toSlug', function() {
  return function(title) {
    if (title === undefined) return undefined;
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  };
})

.controller('BrowseCtrl', ['$scope', '$firebaseArray', '$firebaseObject', 'FBURL', 'groupAlphabeticallyAndBind', 'toSlugFilter',
  function($scope, $firebaseArray, $firebaseObject, FBURL, groupAlphabeticallyAndBind, toSlug) {
    var FbRoot = new Firebase(FBURL);

    groupAlphabeticallyAndBind({
      scope: $scope,
      field: 'byTitle',
      array: $firebaseArray(FbRoot.child('recipesMeta')),
      label: function(recipe) { return recipe.title; },
      value: function(recipe) { return toSlug(recipe.title); }
    });

    var ingredientNames = $firebaseArray(FbRoot.child('ingredientNames'));
    var ingredientRecipes = FbRoot.child('ingredientRecipes');
    groupAlphabeticallyAndBind({
      scope: $scope,
      field: 'byIngredient',
      array: ingredientNames,
      label: function(ingredient) {
        return decodeURIComponent(ingredientNames.$keyAt(ingredient));
      },
      value: function(ingredient) { return ingredient.$value; },
    });

    $scope.toggleCollapsed = function($event) {
      // Toggles the 'collapsed' class on the parent of the clicked element.
      $event.currentTarget.parentElement.classList.toggle('collapsed');
    };

    $scope.loadedRecipes = {};
    $scope.lazyLoadIngredientRecipes = function(ingredient) {
      if ($scope.loadedRecipes[ingredient.value]) return;
      $scope.loadedRecipes[ingredient.value] =
        $firebaseArray(ingredientRecipes.child(ingredient.value));
    };
}])
;
