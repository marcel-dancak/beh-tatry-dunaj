(function() {
  'use strict';

  MyApp.angular
    .controller('AppController', AppController)
    .constant('Config', {
      SECTIONS_URL: 'https://api.myjson.com/bins/3w2k5',
      // SECTIONS_URL: 'https://api.myjson.com/bins/3epk5',
      MESSAGES_URL: 'https://api.myjson.com/bins/1hte1'
    })
    .directive('onLongPress', function($timeout) {
      return {
        restrict: 'A',
        link: function($scope, $elm, $attrs) {
          $elm.bind('touchstart', function(evt) {
            // Locally scoped variable that will keep track of the long press
            $scope.longPress = true;

            // We'll set a timeout for 600 ms for a long press
            $timeout(function() {
              if ($scope.longPress) {
                // If the touchend event hasn't fired,
                // apply the function given in on the element's on-long-press attribute
                $scope.$apply(function() {
                  $scope.$eval($attrs.onLongPress)
                });
              }
            }, 600);
          });

          $elm.bind('touchend', function(evt) {
            // Prevent the onLongPress event from firing
            $scope.longPress = false;
            // If there is an on-touch-end function attached to this element, apply it
            if ($attrs.onTouchEnd) {
              $scope.$apply(function() {
                $scope.$eval($attrs.onTouchEnd)
              });
            }
          });
        }
      };
    });

  function AppController($scope, $q, $http, Config) {

    var runners = {};
    window.DATA.runners.forEach(function(runner) {
      runners[runner.id] = runner;
    });
    $scope.runners = runners;

    $scope.loadState = function() {
      var startTime = localStorage.getItem('startTime');
      // startTime = "09:40"
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

    function getSections() {
      var task = $q.defer();
      $http.get(Config.SECTIONS_URL).then(function(response) {
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
      }, function() {
        task.reject();
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
        // calculate expected run duration
        var expectedDuration = section.k * (section.length/10) * section.runner.time_on_10km;
        section.expectedDuration = expectedDuration.toFixed(2);

        if (section.time) {
          var start = moment(prevSection.time, "HH:mm:ss");
          var end = moment(section.time, "HH:mm:ss");
          var duration = end.diff(start, 'seconds');
          if (duration < 0) {
            end.add(1, 'day');
            duration = end.diff(start, 'seconds');
          }
          section.duration = moment.duration(duration, "seconds").format("HH:mm:ss");

          // compare with expected duration
          var expectedDurationInSeconds = 60 * section.expectedDuration;
          var comparison = duration - expectedDurationInSeconds;
          section.comparison = (comparison >= 0? '+' : '-') + moment.duration(Math.abs(comparison), "seconds").format("mm:ss", {trim: false});

          startIndex++;
        } else if (!section.time && prevSection.time) {
          $scope.runningSectionId = section.id;
          var start = moment(prevSection.time, "HH:mm:ss");
          var elapsedMinutes = moment().diff(start, 'minutes');
          if (elapsedMinutes < 0) {
            start.subtract(1, 'day');
            elapsedMinutes = moment().diff(start, 'minutes');
          }
          $scope.runningSectionTime = prettyMinutes(elapsedMinutes);
          section.expectedStart = moment(prevSection.time, "HH:mm:ss");
        } else if (prevSection.expectedStart) {
          section.expectedStart = prevSection.expectedStart.clone().add(prevSection.expectedDuration, 'minute');
        }
        prevSection = section;
      });
      var lastSection = sections[sections.length-1];
      if (lastSection.time) {
        $scope.finishTime = moment(lastSection.time, "HH:mm:ss");
      } else {
        $scope.finishTime = null;
        $scope.expectedFinish = lastSection.expectedStart.clone().add(lastSection.expectedDuration, 'minute');
      }

      $scope.filter = Math.max(-(sections.length-startIndex+1), -sections.length);
      $scope.filter = Math.min($scope.filter, -3); // show at least 3 items
    }

    $scope.showNetworkErrorNotification = function(cssSelector) {
      setTimeout(function() {

        MyApp.fw7.app.addNotification({
          message: 'Chyba pripojenia',
          button: {
            text: 'Skúsiť znova',
            color: 'yellow',
            close: true
          },
          additionalClass: 'network-error',
          onClose: function () {
            MyApp.fw7.app.pullToRefreshTrigger(cssSelector);
          }
        });
      }, 400);
    };

    $scope.fetchData = function() {
      var task = $q.defer();

      getSections().then(function(sections) {
        if ($scope.pendingOperations) {
          // console.log('Merge and Upload new sections');
          // console.log($scope.pendingOperations);
          $scope.saveState();
          // console.log(JSON.stringify(sections))
          localStorage.setItem('sections-backup', JSON.stringify(sections));

          var overrideError = false;
          for (var sectionId in $scope.pendingOperations) {
            var section = sections[sectionId-1];
            var diff = $scope.pendingOperations[sectionId];
            for (var key in diff) {
              // console.log('checking: '+section[key]+' vs: '+diff[key].old);
              // check if record wasn't changed in the meantime
              if (section[key] === diff[key].old) {
                section[key] = diff[key].new;
              } else {
                overrideError = true;
              }
            }
          }
          if (overrideError) {
            MyApp.fw7.app.addNotification({
              message: 'Nastala kolízia s inými zmenami, niektore údaje neboli uložené.',
              button: {
                text: 'Zatvoriť',
                color: 'yellow',
                close: true
              }
            });
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
          // console.log(data);
          $http.put(Config.SECTIONS_URL, data).then(function() {
            $scope.pendingOperations = {};
            $scope.saveState();
          }, function() {
            $scope.showNetworkErrorNotification('.index.pull-to-refresh-content');
          });
        }

        sections.forEach(function(section) {
          section.runner = $scope.runners[section.runner];
        });
        $scope.updateSectionsList(sections);

        $scope.sections = sections;
        task.resolve();
      }, function() {
        // handle error
        if (!$scope.sections) {
          // TODO recover from backup
          var backup = localStorage.getItem('sections-backup');
          if (backup) {
            var sections = JSON.parse(backup);
          }
        }
        $scope.showNetworkErrorNotification('.index.pull-to-refresh-content');
        task.reject();
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
      history.pushState({page: "detail"}, "Detail");
      MyApp.fw7.app.mainView.router.loadPage({pageName: 'detail'});
    };

    $scope.back = function(event) {
      history.back();
    };

    history.pushState({page: 'index'}, "Index");
    window.onpopstate = function(evt) {
      console.log(evt.state);
      if (evt.state && evt.state.page) {
        MyApp.fw7.app.mainView.router.back({pageName: evt.state.page});
      } else {
        // console.log('Close App');
        history.back();
      }
    }

    $scope.resetData = function() {

      function newStart(startTime) {
        startTime = moment(startTime, "HH:mm");
        if (!startTime.isValid()) {
          startTime = moment().minute(0).second(0);
        };
        var data = {
          sections: window.DATA.sections_empty,
          start: startTime.format("HH:mm")
        }
        $http.put(Config.SECTIONS_URL, data).then(function() {
          $scope.startTime = startTime;
          $scope.pendingOperations = [];
          $scope.saveState();
          MyApp.fw7.app.pullToRefreshTrigger('.index.pull-to-refresh-content');
          $http.put(Config.MESSAGES_URL, []);
        });
      }
      var checkCode = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
      MyApp.fw7.app.prompt('Zadaj kód: '+checkCode, 'Kontrola', function(value) {
        if (value === checkCode) {
          MyApp.fw7.app.prompt('Nastaviť čas štartu (HH:MM)', 'Nové meranie', newStart);
        }
      });
    };
  }

 })();