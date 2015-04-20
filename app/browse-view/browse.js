angular.module('cookbookApp.browse', [])

.controller('BrowseCtrl', ['$scope', '$firebaseArray', 'FBURL',
  function($scope, $firebaseArray, FBURL) {
    function urlFromTitle(title) {
      return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    };
    var collator = new Intl.Collator();
    var collate = collator.compare.bind(collator);
    function collateBy(projection) {
      return function(a, b) {
        return collate(projection(a), projection(b));
      };
    };

    var recipesMeta = $firebaseArray(new Firebase(FBURL).child('recipesMeta'));
    function arrangeRecipes() {
      var byTitle = {};
      recipesMeta.forEach(function(recipe) {
        var id = recipesMeta.$keyAt(recipe);
        var title = recipe.title;
        if (title.length === 0) return;
        var firstLetter = title[0].toUpperCase();
        var url = urlFromTitle(title);
        if (byTitle[firstLetter] === undefined)
          byTitle[firstLetter] = [];
        byTitle[firstLetter].push({
          title: title,
          url: url,
        });
      });
      var byTitleArray = [];
      angular.forEach(byTitle, function(recipes, firstLetter) {
        recipes.sort(collateBy(function(recipe) { return recipe.title; }));
        byTitleArray.push({firstLetter: firstLetter, recipes: recipes});
      });
      byTitleArray.sort(collateBy(function(letter) { return letter.firstLetter; }));
      $scope.byTitle = byTitleArray;
    };
    recipesMeta.$loaded().then(function() {
      recipesMeta.$watch(arrangeRecipes);
      arrangeRecipes();
    });

    $scope.toggleCollapsed = function($event) {
      // Toggles the 'collapsed' class on the parent of the clicked element.
      $event.currentTarget.parentElement.classList.toggle('collapsed');
    };
}])
;
