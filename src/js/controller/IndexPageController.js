/*jslint browser: true*/
/*global console, MyApp*/

MyApp.angular.controller('IndexPageController', function ($scope, $http, $timeout, $q, InitService) {
  'use strict';

  MyApp.fw7.app.onPageReinit('index', function(page) {
    console.log('Reinit of index page');
    $timeout(function() {
      if ($scope.sections) {
        $scope.updateSectionsList($scope.sections);
      }
      //$scope.fetchData();
    }, 10);
  });


  $scope.showResults = function() {
    history.pushState({page: "results"}, "Results");
    MyApp.fw7.app.mainView.router.loadPage({pageName: 'resultsPage'});
  };

  InitService.addEventListener('ready', function () {
    
    var ptrContent = Dom7('.pull-to-refresh-content');
    ptrContent.on('refresh', function(e) {
      $timeout(function () {
        $scope.fetchData().then(function() {
          setTimeout(function() {
            MyApp.fw7.app.pullToRefreshDone();
          }, 500);
        });
      });
    });

    MyApp.fw7.app.pullToRefreshTrigger(ptrContent);
    // $scope.fetchData();
  });
  
});