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
    }, 10);
  });


  $scope.showResults = function() {
    history.pushState({page: "results"}, "Results");
    MyApp.fw7.app.mainView.router.loadPage({pageName: 'resultsPage'});
  };

  $scope.showMessages = function() {
    history.pushState({page: "messages"}, "Messages");
    MyApp.fw7.app.mainView.router.loadPage({pageName: 'messagesPage'});
  };

  InitService.addEventListener('ready', function () {
    
    var ptrContent = Dom7('.index.pull-to-refresh-content');
    ptrContent.on('refresh', function(e) {
      MyApp.fw7.app.closeNotification('.notification-item.network-error');
      $timeout(function () {
        $scope.fetchData().finally(function() {
          MyApp.fw7.app.pullToRefreshDone();
        });
      });
    });

    MyApp.fw7.app.pullToRefreshTrigger(ptrContent);
    // $scope.fetchData();
  });
  
});