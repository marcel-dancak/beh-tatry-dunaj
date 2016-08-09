(function() {
  'use strict';

  MyApp.angular
    .controller('AppController', AppController)

  function AppController($scope, $q, $http) {
    //var SECTIONS_URL = 'https://api.myjson.com/bins/3w2k5';
    var SECTIONS_URL = 'https://api.myjson.com/bins/3epk5';

    $scope.loadState = function() {
      var startTime = localStorage.getItem('startTime');
      if (startTime) {
        startTime = moment(startTime, "HH:mm");
      } else {
        startTime = moment().minute(0).second(0);
      }
      $scope.startTime = startTime;

      var pendingOperations = localStorage.getItem('pendingOperations');
      if (pendingOperations) {
        pendingOperations = JSON.parse(pendingOperations);
      } else {
        pendingOperations = [];
      }
      $scope.pendingOperations = pendingOperations;
    };

    $scope.saveState = function() {
      localStorage.setItem('startTime', $scope.startTime.format("HH:mm"));
      localStorage.setItem('pendingOperations', JSON.stringify($scope.pendingOperations));
    }
    $scope.loadState();

    function getRunners() {
      if ($scope.runners) {
        return $q.when($scope.runners);
      }
      var runners = {};
      window.DATA.runners.forEach(function(runner) {
        runners[runner.id] = runner;
      });
      // console.log(JSON.stringify(runners));
      return $q.when(runners);

      /*
      var task = $q.defer();
      $http.get(RUNNERS_URL).then(function(response) {
        var runners = {};
        response.data.forEach(function(runner) {
          runners[runner.id] = runner;
        });
        task.resolve(runners);
      });
      return task.promise;
      */
    }

    function getSections() {
      // if ($scope.sections) {
      //   var json = JSON.stringify($scope.sections, function(key, value) {
      //     if (key === 'expectedStart') {
      //       return undefined;
      //     }
      //     if (key === 'runner') {
      //       return value.id;
      //     }
      //     return value;
      //   });
      //   // console.log(json);
      //   return $q.when(JSON.parse(json));
      // }
      var task = $q.defer();
      $http.get(SECTIONS_URL).then(function(response) {
      // $http.get('data/sections_data.json').then(function(response) {
        var sections = response.data.sections;
        // check/update startTime
        if (response.data.start) {
          var start = moment(response.data.start, "HH:mm");
          if (start.isValid()) {
            $scope.startTime = start;
          }
        }
        angular.merge(sections, window.DATA.sections_static);
        task.resolve(sections);
      });
      return task.promise;
    }

    function prettyMinutes(minutes) {
      if (minutes === 1) {
        return "1 minútu";
      } else if (minutes > 1 && minutes < 5) {
        return minutes+" minúty";
      } else {
        return minutes + " minút";
      }
    }

    $scope.updateSectionsList = function(sections) {
      $scope.runningSectionId = -1;
      var startIndex = 0;
      var prevSection = {time: $scope.startTime.format("HH:mm:ss")};
      console.log('updateSectionsList: '+sections.length);
      sections.forEach(function(section) {
        console.log(section.time);
        if (section.time) {
          var start = moment(prevSection.time, "HH:mm:ss");
          var end = moment(section.time, "HH:mm:ss");
          var duration = end.diff(start, 'seconds');
          section.duration = moment.duration(duration, "seconds").format("HH:mm:ss");

          // compare with expected duration
          var expectedDurationInSeconds = 60 * ((section.length/10)*section.runner.time_on_10km);
          var comparison = duration - expectedDurationInSeconds;
          section.comparison = (comparison >= 0? '+' : '-') + moment.duration(Math.abs(comparison), "seconds").format("mm:ss", {trim: false});

          startIndex++;
        } else if (!section.time && prevSection.time) {
          $scope.runningSectionId = section.id;
          var start = moment(prevSection.time, "HH:mm:ss");
          // $scope.runningSectionTime = start.toNow(true);
          var elapsedMinutes = moment().diff(start, 'minutes');
          if (elapsedMinutes < 0) {
            start.subtract(1, 'day');
            elapsedMinutes = moment().diff(start, 'minutes');
          }
          $scope.runningSectionTime = prettyMinutes(elapsedMinutes);
          section.expectedStart = moment(prevSection.time, "HH:mm:ss");
        } else if (prevSection.expectedStart) {
          var runnerExpectedTime = (prevSection.length/10)*prevSection.runner.time_on_10km;
          runnerExpectedTime = parseInt(runnerExpectedTime);
          console.log(section.id+': '+runnerExpectedTime+' / on 10km: '+prevSection.runner.time_on_10km);
          console.log(prevSection.expectedStart.format('HH:mm')+' -> '+prevSection.expectedStart.clone().add(runnerExpectedTime, 'minute').format('HH:mm'));
          section.expectedStart = prevSection.expectedStart.clone().add(runnerExpectedTime, 'minute');
        }
        prevSection = section;
      });
      $scope.filter = Math.max(-(sections.length-startIndex+1), -sections.length);
      $scope.filter = Math.min($scope.filter, -3); // show at least 3 items
    }

    $scope.fetchData = function() {
      console.log('fetchData');
      var task = $q.defer();

      getRunners().then(function(runners) {
        $scope.runners = runners;

        getSections().then(function(sections) {
          if ($scope.pendingOperations) {
            console.log('Merge and Upload new sections');
            console.log($scope.pendingOperations);
            $scope.saveState();

            for (var sectionId in $scope.pendingOperations) {
              var section = sections[sectionId-1];
              var diff = $scope.pendingOperations[sectionId];
              for (var key in diff) {
                section[key] = diff[key].new;
              }
            }
            var json = JSON.stringify(sections, function(key, value) {
              if (key === '' || key === 'id' || key === 'runner' || key === 'time' || Number.isInteger(parseInt(key))) {
                return value;
              }
              return undefined;
            });
            var data = {
              sections: JSON.parse(json),
              start: $scope.startTime.format("HH:mm")
            }
            console.log(data);
            $http.put(SECTIONS_URL, data).then(function() {
              $scope.pendingOperations = {};
              $scope.saveState();
            });
          }

          sections.forEach(function(section) {
            section.runner = runners[section.runner];
          });
          $scope.updateSectionsList(sections);

          $scope.sections = sections;
          task.resolve();
        });

      });
      return task.promise;
    };


    $scope.detail = {
      section: null,
      runner: null,
      finish_time: ""
    };

    $scope.detailPage = function(section) {
      console.log(section);
      $scope.detail.section = section;
      $scope.detail.runner = angular.copy(section.runner);
      $scope.detail.finish_time = section.time || "";
      // history.pushState({page: "detail"}, "Detail", "/#detail");
      history.pushState({page: "detail"}, "Detail");
      MyApp.fw7.app.mainView.router.loadPage({pageName: 'detail'});
    };

    $scope.back = function(event) {
      console.log('back');
      history.back();
    };

    // history.pushState({page: 'index'}, "Index", "/#index");
    history.pushState({page: 'index'}, "Index");
    window.onpopstate = function(evt) {
      console.log(evt.state);
      if (evt.state && evt.state.page) {
        MyApp.fw7.app.mainView.router.back({pageName: evt.state.page});
        // history.replaceState({page: null}, "");
        // history.state.page = null;
        // evt.state.page = null;
      } else {
        console.log('exit');
        history.back();
      }
    }

    $scope.resetData = function() {
      /*
      function reset() {
        $http.get('data/sections_data.json').then(function(response) {
          $http.put(SECTIONS_URL, response.data).then(function() {
            $scope.sections = null;

            $scope.startTime = moment().minute(0).second(0);
            $scope.pendingOperations = [];
            $scope.saveState();
            MyApp.fw7.app.pullToRefreshTrigger(Dom7('.pull-to-refresh-content'));
          });
        });
      }
      MyApp.fw7.app.confirm('Vymazať dáta?', 'Potvrdenie', reset);
      */

      function newStart(startTime) {
        console.log(startTime);
        startTime = moment(startTime, "HH:mm");
        if (!startTime.isValid()) {
          startTime = moment().minute(0).second(0);
        };

        $http.get('data/sections_data.json').then(function(response) {
          var data = {
            sections: response.data.sections,
            start: startTime.format("HH:mm")
          }
          $http.put(SECTIONS_URL, data).then(function() {
            $scope.startTime = startTime;
            $scope.pendingOperations = [];
            $scope.saveState();
            MyApp.fw7.app.pullToRefreshTrigger(Dom7('.pull-to-refresh-content'));
          });
        });
      }
      MyApp.fw7.app.prompt('Nastaviť čas štartu (HH:MM)', 'Nové meranie', newStart);
    };
  }

 })();