/*jslint browser: true*/
/*global console, MyApp*/

MyApp.angular.controller('DetailPageController', function ($scope, $timeout, InitService) {
  'use strict';

  $scope.getTime = function() {
    return moment().format("HH:mm:ss");
  };

  $scope.formatTelNumber = function(number) {
    if (number) {
      return number.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
    }
    return '';
  };

  $scope.callNumber = function(number) {
    window.plugins.CallNumber.callNumber(angular.noop, angular.noop, number, false);
  };

  // DOM ready
  InitService.addEventListener('ready', function () {

    var runnersList = [];
    for (var i = 1; i <= 12; i++) {
      runnersList.push($scope.runners[i]);
    }
    var autocompleteDropdownAll = MyApp.fw7.app.autocomplete({
      input: '.runner-autocomplete',
      openIn: 'dropdown',
      textProperty: 'name',
      source: function (autocomplete, query, render) {
        var results = [];
        // Find matched items
        for (var i = 0; i < runnersList.length; i++) {
            if (runnersList[i].name.toLowerCase().indexOf(query.toLowerCase()) >= 0) results.push(runnersList[i]);
        }
        // Render items by passing array with result items
        render(results);
      },
      onChange: function (autocomplete, value) {
        $timeout(function() {
          angular.merge($scope.detail.runner, value);
        });
      }
    });

    function onPageEntered(page) {
      // console.log('Detail page entered');
      autocompleteDropdownAll.input.val($scope.detail.runner.name);
    }
    MyApp.fw7.app.onPageInit('detail', onPageEntered);
    MyApp.fw7.app.onPageReinit('detail', onPageEntered);



    MyApp.fw7.app.onPageBack('detail', function(page) {
      console.log('Detail page leaved');
      console.log($scope.detail.section.runner);
      console.log($scope.detail.runner);

      var sectionUpdate = {};

      var finishTime = moment($scope.detail.finish_time, "HH:mm:ss");
      if (finishTime.isValid()) {
        finishTime = finishTime.format("HH:mm:ss");
      } else {
        finishTime = "";
      }

      if (finishTime !== ($scope.detail.section.time || "")) {
        sectionUpdate.time = {
          'old': $scope.detail.section.time,
          'new': finishTime
        };
        $scope.detail.section.time = finishTime;
      }
    
      if ($scope.detail.runner.id !== $scope.detail.section.runner.id) {
        sectionUpdate.runner = {
          'old': $scope.detail.section.runner.id,
          'new': $scope.detail.runner.id
        };

        $scope.detail.section.runner = $scope.runners[$scope.detail.runner.id];
      }
      if (Object.keys(sectionUpdate).length > 0) {
        console.log('Change Detected');
        $scope.pendingOperations[$scope.detail.section.id] = sectionUpdate;
        $timeout(function() {
          MyApp.fw7.app.pullToRefreshTrigger('.index.pull-to-refresh-content');
        }, 500);
      }
    });
  });
  
});