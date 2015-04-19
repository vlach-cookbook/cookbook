'use strict';

// Declare app level module which depends on filters, and services
angular.module('cookbookApp', [
    'cookbookApp.config',
    'cookbookApp.controllers',
    'cookbookApp.decorators',
    'cookbookApp.directives',
    'cookbookApp.filters',
    'cookbookApp.routes',
    'cookbookApp.services',
    'cookbookApp.recipe',
    'cookbookApp.browse',
  ])
.config(['$locationProvider', function($locationProvider) {
  $locationProvider.html5Mode(true);
}])
;
