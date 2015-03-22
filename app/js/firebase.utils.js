
// a simple wrapper on Firebase and AngularFire to simplify deps and keep things DRY
angular.module('firebase.utils', ['firebase', 'myApp.config'])
  .factory('fbutil', ['$window', 'FBURL', '$firebaseObject', '$firebaseArray',
    function($window, FBURL, $firebaseObject, $firebaseArray) {
      "use strict";

      return {
        syncObject: function(path) {
          return $firebaseObject(firebaseRef(path));
        },

        syncArray: function(path, options) {
          var ref = firebaseRef(path);
          if (options.hasOwnProperty('limit')) {
            ref = ref.limit(options.limit);
          }
          if (options.hasOwnProperty('startAt')) {
            ref = ref.startAt(options.startAt);
          }
          if (options.hasOwnProperty('endAt')) {
            ref = ref.endAt(options.endAt);
          }
          return $firebaseArray(ref);
        },

        ref: firebaseRef
      };

      function pathRef(args) {
        for (var i = 0; i < args.length; i++) {
          if (angular.isArray(args[i])) {
            args[i] = pathRef(args[i]);
          }
          else if( typeof args[i] !== 'string' ) {
            throw new Error('Argument '+i+' to firebaseRef is not a string: '+args[i]);
          }
        }
        return args.join('/');
      }

      /**
       * Example:
       * <code>
       *    function(firebaseRef) {
         *       var ref = firebaseRef('path/to/data');
         *    }
       * </code>
       *
       * @function
       * @name firebaseRef
       * @param {String|Array...} path relative path to the root folder in Firebase instance
       * @return a Firebase instance
       */
      function firebaseRef(path) {
        var ref = new $window.Firebase(FBURL);
        var args = Array.prototype.slice.call(arguments);
        if( args.length ) {
          ref = ref.child(pathRef(args));
        }
        return ref;
      }
}]);

