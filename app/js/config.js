'use strict';

// Declare app level module which depends on filters, and services
angular.module('cookbookApp.config', [])
  .constant('version', '0.0.1')

  // where to redirect users if they need to authenticate (see routeSecurity.js)
  .constant('loginRedirectPath', '/login')

  // The Firebase data URL for Cookbook:
  .constant('FBURL', 'https://vlookbook.firebaseio.com')
;

