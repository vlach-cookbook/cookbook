angular.module('cookbookApp.login', ['ngRoute', 'ngSanitize', 'ngMessages'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/login', {
    templateUrl: 'login-view/login.html',
    controller: 'LoginCtrl'
  });
}])

.controller('LoginCtrl', ['$scope', '$firebaseAuth', 'fbRoot', '$location', function($scope, $firebaseAuth, fbRoot, $location) {
  $scope.authObj = $firebaseAuth(fbRoot);

  fbRoot.onAuth(function handleAuth(authData) {
    if (authData !== null) {
      var target = $location.search().target || '/account';
      $location.url(target);
    }
  });

  function reportAuthFailure(err) {
    console.error(err);
    $scope.err = err;
    if (err.code) {
      err[err.code] = true;
    } else {
      err.other = true;
    }
  };

  $scope.login = function() {
    $scope.err = null;
    $scope.authObj.$authWithPassword({
      email: $scope.email,
      password: $scope.pass
    }).catch(reportAuthFailure);
  };

  $scope.createAccount = function() {
    $scope.err = null;
    if ($scope.pass !== $scope.confirm) {
      $scope.err.passwordMismatch = true;
      return;
    }
    $scope.authObj.$createUser({
      email: $scope.email,
      password: $scope.pass,
    }).then(function(userData) {
      return $scope.authObj.$authWithPassword({
        email: $scope.email,
        password: $scope.pass,
      });
    }).catch(reportAuthFailure);
  };
}])

;
