/*jslint browser: true*/
/*global console, MyApp*/

MyApp.angular.controller('MessagesController', function ($scope, $q, $timeout, $http, InitService) {
  'use strict';

  var MESSAGES_URL = 'https://api.myjson.com/bins/1hte1';
  var messageBar;
  var messenger;

  function refresh() {
    MyApp.fw7.app.pullToRefreshTrigger('.messages-content.pull-to-refresh-content');
  }

  $scope.promptUserName = function() {
    var task = $q.defer();
    MyApp.fw7.app.prompt(
      '',
      'Zadaj meno',
      function(name) {
        localStorage.setItem('name', name);
        $timeout(function() {
          $scope.userName = name;
        });
        task.resolve();
        refresh();
      },
      refresh
    );
    return task.promise;
  };

  $scope.sendMessage = function() {
    var text = messageBar.value().trim();
    if (!text) {
      return;
    }
    $http.get(MESSAGES_URL).then(function(resp) {
      var messages = resp.data;
      var name = localStorage.getItem('name') || '';
      var message = {
        text: text,
        name: name,
        day: moment().format("MMM DD"),
        time: moment().format("HH:mm")
      };
      
      messages.push(message);
      $http.put(MESSAGES_URL, messages).then(function() {
        messenger.addMessage(message);
        messageBar.value('');
      });
    });
  };

  function loadMessages() {
    var task = $q.defer();
    $http.get(MESSAGES_URL).then(function(resp) {
      var messages = resp.data.reverse();
      var name = localStorage.getItem('name') || '';
      messages.forEach(function(message, index) {
        message.type = (message.name === name)? 'sent' : 'received';
      });
      messenger.removeMessages('.messages-date');
      messenger.removeMessages('.message');
      messenger.addMessages(messages);
      task.resolve();
    });
    return task.promise;
  }

  InitService.addEventListener('ready', function () {

    function onPageInit(page) {
      console.log('Messages page entered');
      messageBar = MyApp.fw7.app.messagebar('.messagebar', {
        maxHeight: 200
      });
      messenger = MyApp.fw7.app.messages('.messages', {
        autoLayout: true,
        newMessagesFirst: true
      });

      var ptrContent = Dom7('.messages-content.pull-to-refresh-content');
      ptrContent.on('refresh', function(e) {
        MyApp.fw7.app.closeNotification('.notification-item.network-error');
        $timeout(function () {
          var promise = loadMessages();
          promise.catch(function() {
            $scope.showNetworkErrorNotification('.messages-content.pull-to-refresh-content');
          });
          promise.finally(function() {
            // setTimeout(function() {
              MyApp.fw7.app.pullToRefreshDone();
            // }, 500);
          });
        });
      });

      onPageEntered();
    }

    function onPageEntered(page) {
      $scope.userName = localStorage.getItem('name');
      if (!$scope.userName) {
        $scope.promptUserName();
      } else {
        refresh();
      }
    }

    MyApp.fw7.app.onPageInit('messagesPage', onPageInit);
    MyApp.fw7.app.onPageReinit('messagesPage', onPageEntered);

  });
});