/*jslint browser: true*/
/*global console, MyApp*/

MyApp.angular.controller('DetailPageController', function ($scope, $timeout, InitService) {
  'use strict';

  $scope.getTime = function() {
  	return moment().format("HH:mm:ss");
  };

  $scope.loadRunnerProfile = function(id) {
    var runner = $scope.runners[id];
    if (runner) {
      $scope.detail.runner.time_on_10km = runner.time_on_10km;
    }
  };

  InitService.addEventListener('ready', function () {
    // DOM ready

    // You can access angular like this:
    // MyApp.angular

    var lastRunnerState;
    function onPageEntered(page) {
      console.log('Detail page entered');
      lastRunnerState = JSON.stringify($scope.detail.runner);
    }
    MyApp.fw7.app.onPageInit('detail', onPageEntered);
    MyApp.fw7.app.onPageReinit('detail', onPageEntered);

    MyApp.fw7.app.onPageBack('detail', function(page) {
      console.log('Detail page leaved');
      var currentState = JSON.stringify($scope.detail.runner);
      console.log(lastRunnerState);
      console.log(currentState);
      var sectionUpdate = {};

      if (lastRunnerState !== currentState) {
        console.log('Runner model changed !!!');
      }
      var finishTime = moment($scope.detail.finish_time, "HH:mm:ss");
      if (finishTime.isValid()) {
        finishTime = finishTime.format("HH:mm:ss");
      } else {
        finishTime = "";
      }
      if (finishTime !== ($scope.detail.section.time || "")) {

        console.log('Finish Time CHANGED');
        sectionUpdate.time = {
          'old': $scope.detail.section.time,
          'new': finishTime
        };
        $scope.detail.section.time = finishTime;
      }
    
      if ($scope.detail.runner.id !== $scope.detail.section.runner.id) {
        console.log('change runner');
        sectionUpdate.runner = {
          'old': $scope.detail.section.runner.id,
          'new': $scope.detail.runner.id
        };

        $scope.runners[$scope.detail.runner.id].time_on_10km = $scope.detail.runner.time_on_10km;
        $scope.detail.section.runner = $scope.runners[$scope.detail.runner.id];
      } else {
        $scope.detail.section.runner.time_on_10km = $scope.detail.runner.time_on_10km;
      }
      if (Object.keys(sectionUpdate).length > 0) {
        console.log('Change Detected');
        $scope.pendingOperations[$scope.detail.section.id] = sectionUpdate;
        $timeout(function() {
          MyApp.fw7.app.pullToRefreshTrigger(Dom7('.pull-to-refresh-content'));
        }, 500);
      }
      // $timeout(function() {
      //   $scope.updateSectionsList($scope.sections);
      // });
    });
  });
  
});