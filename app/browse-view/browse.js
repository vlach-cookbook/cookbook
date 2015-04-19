angular.module('cookbookApp.browse', [])

.controller('BrowseCtrl', ['$scope', '$firebaseArray', 'FBURL',
  function($scope, $firebaseArray, FBURL) {
    function urlFromTitle(title) {
      return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    };
    function compareBy(projection) {
      return function(a, b) {
        var proj_a = projection(a), proj_b = projection(b);
        if (proj_a < proj_b) return -1;
        if (proj_a > proj_b) return 1;
        return 0;
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
        recipes.sort(compareBy(function(recipe) { return recipe.title; }));
        byTitleArray.push({firstLetter: firstLetter, recipes: recipes});
      });
      byTitleArray.sort(compareBy(function(letter) { return letter.firstLetter; }));
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
