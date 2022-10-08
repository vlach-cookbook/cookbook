angular.module('cookbookApp.login', ['ngRoute', 'ngSanitize', 'ngMessages'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/login', {
    templateUrl: 'login-view/login.html',
    controller: 'LoginCtrl'
  });
}])

.run(['$rootScope', '$location', function($rootScope, $location) {
  $rootScope.$on('$routeChangeError', function(event, next, previous, error) {
    // When a route's uses Auth.$requireAuth() to require a login,
    // non-logged in sessions will fire the $routeChangeError event
    // and land here. This redirects them to the login form, with a
    // query parameter indicating what state to redirect them back to
    // upon a successful login.
    if (error === 'AUTH_REQUIRED') {
      var url = $location.url();
      $location.url('/login').search('target', url);
    }
  });
}])

.controller('LoginCtrl', ['$scope', 'Auth', 'fbRoot', '$location', function($scope, Auth, fbRoot, $location) {
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
    Auth.$authWithPassword({
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
    Auth.$createUser({
      email: $scope.email,
      password: $scope.pass,
    }).then(function(userData) {
      return Auth.$authWithPassword({
        email: $scope.email,
        password: $scope.pass,
      });
    }).catch(reportAuthFailure);
  };

  $scope.forgotPassword = function() {
    Auth.$resetPassword({
      email: $scope.email,
    }).then(function() {
      $scope.err = {other: true,
                    message: 'Check your email to reset your password.'};
    }, reportAuthFailure);
  };
}])

;
