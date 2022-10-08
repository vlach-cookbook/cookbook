(function() {
   'use strict';

   /* Services */

   angular.module('cookbookApp.services', [])

      // put your services here!
      // .service('serviceName', ['dependency', function(dependency) {}]);

     .factory('messageList', ['fbutil', function(fbutil) {
       return fbutil.syncArray('messages', {limit: 10, endAt: null});
     }])

    .factory('Auth', ['$firebaseAuth', 'fbRoot', function($firebaseAuth, fbRoot) {
      return $firebaseAuth(fbRoot);
    }])
  ;

})();
