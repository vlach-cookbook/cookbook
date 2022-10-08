angular.module('cookbookApp.account', ['ngRoute', 'ngSanitize', 'ngMessages'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/account', {
    templateUrl: 'account-view/account.html',
    controller: 'AccountCtrl',
    resolve: {
      currentAuth: ['Auth', function(Auth) {
        return Auth.$requireAuth();
      }],
    },
  });
}])

.controller('AccountCtrl', ['$scope', 'Auth', 'fbRoot', 'currentAuth', '$location', '$firebaseObject', function($scope, Auth, fbRoot, currentAuth, $location, $firebaseObject) {
  var profile = null;
  function onAuth(authData) {
    $scope.authData = authData;
    if (profile) {
      profile.$destroy();
      profile = null;
    }
    if (authData) {
      var profileRef = fbRoot.child('users').child(authData.uid);
      profileRef.child('email').set(authData.password.email);
      profile = $firebaseObject(profileRef);
      profile.$bindTo($scope, 'profile');
    }
  };
  onAuth(currentAuth);
  Auth.$onAuth(onAuth);

  $scope.logout = function() {
    if (profile) {
      profile.$destroy();
      profile = null;
    }
    Auth.$unauth();
    $location.url('/');
  };

  $scope.changePassword = function(pass, confirm, newPass) {
    resetMessages();
    if( !pass || !confirm || !newPass ) {
      $scope.err = 'Please fill in all password fields';
    } else if( newPass !== confirm ) {
      $scope.err = 'New pass and confirm do not match';
    } else {
      Auth.$changePassword({
        email: profile.email,
        oldPassword: pass,
        newPassword: newPass
      }).then(function() {
        $scope.msg = 'Password changed';
        $scope.oldpass = $scope.newpass = $scope.confirm = '';
      }, function(err) {
        $scope.err = err.message;
      });
    }
  };

  $scope.clear = resetMessages;

  $scope.changeEmail = function(pass, newEmail) {
    resetMessages();
    var oldEmail = profile.email;
    Auth.$changeEmail({
      oldEmail: oldEmail,
      newEmail: newEmail,
      password: pass,
    }).then(function(user) {
      $scope.emailmsg = 'Email changed';
    }, function(err) {
      $scope.emailerr = err.message;
    });
  };

  function resetMessages() {
    $scope.err = null;
    $scope.msg = null;
    $scope.emailerr = null;
    $scope.emailmsg = null;
  }
}])

;
