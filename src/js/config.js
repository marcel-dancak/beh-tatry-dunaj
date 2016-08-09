/*jslint browser: true*/
/*global console, MyApp, angular, Framework7*/

// Init angular
var MyApp = {};

MyApp.config = {
};

MyApp.angular = angular.module('MyApp', []);

MyApp.fw7 = {
  app : new Framework7({
    animateNavBackIcon: true,
    material: true,
    initMaterialWatchInputs: true,
    materialRipple: false
  }),
  options : {
    domCache: true,
    init: false
  }
};

MyApp.fw7.app.onPageInit('index', function(page) {
  console.log('index page initialized');
});